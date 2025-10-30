import AboutPage from '../pages/about/about-page';
import DetailPage from '../pages/detail/detail-page';
import MapPage from '../pages/map/map-page';
import LoginPage from '../pages/auth/login-page';
import RegisterPage from '../pages/auth/register-page';
import StoryListPage from '../pages/story/story-list-page';
import StoryDetailPage from '../pages/story/story-detail-page';
import AddStoryPage from '../pages/story/add-story-page';

const routes = {
  '/': new StoryListPage(),
  '/about': new AboutPage(),
  '/movie/:id': new DetailPage(),
  '/map': new MapPage(),
  '/add-story': new AddStoryPage(),
  '/login': new LoginPage(),
  '/register': new RegisterPage(),
  '/stories': new StoryListPage(),
  '/story/:id': new StoryDetailPage(),
};

export default routes;
