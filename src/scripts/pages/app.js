import routes from '../routes/routes';
import { getActiveRoute } from '../routes/url-parser';
import PageTransition from '../utils/page-transition';

class App {
  #content = null;
  #drawerButton = null;
  #navigationDrawer = null;
  #currentPage = null;

  constructor({ navigationDrawer, drawerButton, content }) {
    this.#content = content;
    this.#drawerButton = drawerButton;
    this.#navigationDrawer = navigationDrawer;

    this._setupDrawer();
  }

  _setupDrawer() {
    this.#drawerButton.addEventListener('click', () => {
      this.#navigationDrawer.classList.toggle('open');
    });

    document.body.addEventListener('click', (event) => {
      if (!this.#navigationDrawer.contains(event.target) && !this.#drawerButton.contains(event.target)) {
        this.#navigationDrawer.classList.remove('open');
      }

      this.#navigationDrawer.querySelectorAll('a').forEach((link) => {
        if (link.contains(event.target)) {
          this.#navigationDrawer.classList.remove('open');
        }
      })
    });
  }

  async renderPage() {
    const url = getActiveRoute();
    const page = routes[url];
    
    if (this.#currentPage !== url) {
      // Apply transition effect
      if (document.startViewTransition) {
        document.startViewTransition(async () => {
          this.#content.innerHTML = await page.render();
          await page.afterRender();
        });
      } else {
        // Fallback for browsers that don't support View Transitions API
        this.#content.classList.add('page-transition');
        setTimeout(async () => {
          this.#content.innerHTML = await page.render();
          await page.afterRender();
          this.#content.classList.remove('page-transition');
        }, 300);
      }
      
      this.#currentPage = url;
    } else {
      this.#content.innerHTML = await page.render();
      await page.afterRender();
    }
  }
}

export default App;
