const PageTransition = {
  applyTransition(content, transitionType = 'fade') {
    if (!document.startViewTransition) {
      content.innerHTML = '';
      return Promise.resolve();
    }

    return document.startViewTransition(() => {
      content.classList.add(`transition-${transitionType}`);
      content.innerHTML = '';
      
      setTimeout(() => {
        content.classList.remove(`transition-${transitionType}`);
      }, 300);
    }).ready;
  }
};

export default PageTransition;