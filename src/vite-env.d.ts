/// <reference types="vite/client" />

// Declare CSS module support
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

// Allow side-effect CSS imports
declare module '*.css' {
  const css: string;
  export default css;
}
