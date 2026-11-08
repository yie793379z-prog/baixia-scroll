import './project-links.css';

const repository='https://github.com/yie793379z-prog/baixia-scroll';
export function ProjectLinks(){
 return <footer className="project-links" aria-label="项目与开源信息">
  <a href={repository} target="_blank" rel="noopener noreferrer">开源代码 · MIT</a>
  <a href={`${repository}/blob/main/CODE_OF_CONDUCT.md`} target="_blank" rel="noopener noreferrer">社区规范</a>
  <a href="https://www.netlify.com/" target="_blank" rel="noopener noreferrer" lang="en">This site is powered by Netlify</a>
 </footer>;
}
