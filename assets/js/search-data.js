// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-blog",
          title: "blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "nav-repositories",
          title: "repositories",
          description: "Edit the `_data/repositories.yml` and change the `github_users` and `github_repos` lists to include your own GitHub profile and repositories.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/repositories/";
          },
        },{id: "nav-bookshelf",
          title: "bookshelf",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/books/";
          },
        },{id: "dropdown-bookshelf",
              title: "bookshelf",
              description: "",
              section: "Dropdown",
              handler: () => {
                window.location.href = "/books/";
              },
            },{id: "dropdown-blog",
              title: "blog",
              description: "",
              section: "Dropdown",
              handler: () => {
                window.location.href = "/blog/";
              },
            },{id: "post-内核模块开发环境及调试",
        
          title: "内核模块开发环境及调试",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/%E5%86%85%E6%A0%B8%E6%A8%A1%E5%9D%97%E5%BC%80%E5%8F%91%E7%8E%AF%E5%A2%83%E5%8F%8A%E8%B0%83%E8%AF%95/";
          
        },
      },{id: "post-水贴-c-应该怎么uaf",
        
          title: "[水贴]C++应该怎么UAF",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/C++%E6%80%8E%E4%B9%88UAF/";
          
        },
      },{id: "post-large-bin-attack及house-of-cat",
        
          title: "large bin attack及house of cat",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2024/largebin-attack-%E4%BB%A5%E5%8F%8A-IO%E6%B5%81%E7%9A%84%E5%88%A9%E7%94%A8(%E4%B8%80)/";
          
        },
      },{id: "post-水贴-记一次离谱报错",
        
          title: "[水贴]记一次离谱报错",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2024/%E8%AE%B0%E4%B8%80%E6%AC%A1%E7%A6%BB%E8%B0%B1%E7%9A%84%E6%8A%A5%E9%94%99/";
          
        },
      },{id: "post-矩阵并行计算的探索-大作业",
        
          title: "矩阵并行计算的探索---大作业",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2024/%E7%9F%A9%E9%98%B5%E5%B9%B6%E8%A1%8C%E8%AE%A1%E7%AE%97%E7%9A%84%E6%8E%A2%E7%B4%A2/";
          
        },
      },{id: "post-xee寄存器和16字节栈对齐",
        
          title: "XEE寄存器和16字节栈对齐.",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2024/XEE%E5%AF%84%E5%AD%98%E5%99%A8%E5%92%8C16%E5%AD%97%E8%8A%82%E6%A0%88%E5%AF%B9%E9%BD%90/";
          
        },
      },{id: "post-dl题内存布局初探",
        
          title: "dl题内存布局初探",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2024/%E5%AF%B9%E5%86%85%E5%AD%98%E5%B8%83%E5%B1%80%E7%9A%84%E4%B8%80%E7%82%B9%E6%8E%A2%E7%B4%A2/";
          
        },
      },{id: "post-glibc动态链接重定位-cnss2024-pwn-boss-wp",
        
          title: "glibc动态链接重定位 + CNSS2024 pwn boss wp",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2024/ret2dlresolve/";
          
        },
      },{id: "post-cnss2024-pwn-方向wp",
        
          title: "CNSS2024 pwn 方向wp",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2024/CNSS2024/";
          
        },
      },{id: "post-从头开始的pwn环境配置",
        
          title: "从头开始的pwn环境配置",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2024/%E4%BB%8E%E5%A4%B4%E5%BC%80%E5%A7%8B%E7%9A%84pwn%E7%8E%AF%E5%A2%83%E9%85%8D%E7%BD%AE/";
          
        },
      },{id: "post-cnss2024夏令营-39-命运石之门-39-writeup",
        
          title: "CNSS2024夏令营&#39;命运石之门&#39;writeup",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2024/writeup-of-Steins;Gate/";
          
        },
      },{id: "post-google-gemini-updates-flash-1-5-gemma-2-and-project-astra",
        
          title: 'Google Gemini updates: Flash 1.5, Gemma 2 and Project Astra <svg width="1.2rem" height="1.2rem" top=".5rem" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M17 13.5v6H5v-12h6m3-3h6v6m0-6-9 9" class="icon_svg-stroke" stroke="#999" stroke-width="1.5" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
        
        description: "We’re sharing updates across our Gemini family of models and a glimpse of Project Astra, our vision for the future of AI assistants.",
        section: "Posts",
        handler: () => {
          
            window.open("https://blog.google/technology/ai/google-gemini-update-flash-ai-assistant-io-2024/", "_blank");
          
        },
      },{id: "post-displaying-external-posts-on-your-al-folio-blog",
        
          title: 'Displaying External Posts on Your al-folio Blog <svg width="1.2rem" height="1.2rem" top=".5rem" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><path d="M17 13.5v6H5v-12h6m3-3h6v6m0-6-9 9" class="icon_svg-stroke" stroke="#999" stroke-width="1.5" fill="none" fill-rule="evenodd" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.open("https://medium.com/@al-folio/displaying-external-posts-on-your-al-folio-blog-b60a1d241a0a?source=rss-17feae71c3c4------2", "_blank");
          
        },
      },{id: "books-the-godfather",
          title: 'The Godfather',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/the_godfather/";
            },},{id: "projects-project-1",
          title: 'project 1',
          description: "with background image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/1_project/";
            },},{id: "projects-project-2",
          title: 'project 2',
          description: "a project with a background image and giscus comments",
          section: "Projects",handler: () => {
              window.location.href = "/projects/2_project/";
            },},{id: "projects-project-3-with-very-long-name",
          title: 'project 3 with very long name',
          description: "a project that redirects to another website",
          section: "Projects",handler: () => {
              window.location.href = "/projects/3_project/";
            },},{id: "projects-project-4",
          title: 'project 4',
          description: "another without an image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/4_project/";
            },},{id: "projects-project-5",
          title: 'project 5',
          description: "a project with a background image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/5_project/";
            },},{id: "projects-project-6",
          title: 'project 6',
          description: "a project with no image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/6_project/";
            },},{id: "projects-project-7",
          title: 'project 7',
          description: "with background image",
          section: "Projects",handler: () => {
              window.location.href = "/projects/7_project/";
            },},{id: "projects-project-8",
          title: 'project 8',
          description: "an other project with a background image and giscus comments",
          section: "Projects",handler: () => {
              window.location.href = "/projects/8_project/";
            },},{id: "projects-project-9",
          title: 'project 9',
          description: "another project with an image 🎉",
          section: "Projects",handler: () => {
              window.location.href = "/projects/9_project/";
            },},{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%79%6F%75@%65%78%61%6D%70%6C%65.%63%6F%6D", "_blank");
        },
      },{
        id: 'social-inspire',
        title: 'Inspire HEP',
        section: 'Socials',
        handler: () => {
          window.open("https://inspirehep.net/authors/1010907", "_blank");
        },
      },{
        id: 'social-rss',
        title: 'RSS Feed',
        section: 'Socials',
        handler: () => {
          window.open("/feed.xml", "_blank");
        },
      },{
        id: 'social-scholar',
        title: 'Google Scholar',
        section: 'Socials',
        handler: () => {
          window.open("https://scholar.google.com/citations?user=qc6CJjYAAAAJ", "_blank");
        },
      },{
        id: 'social-custom_social',
        title: 'Custom_social',
        section: 'Socials',
        handler: () => {
          window.open("https://www.alberteinstein.com/", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
