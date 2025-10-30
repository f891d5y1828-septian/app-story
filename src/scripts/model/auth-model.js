import CONFIG from '../config';

class AuthModel {
  constructor() {
    this._baseUrl = CONFIG.BASE_URL;
  }

  async register(name, email, password) {
    try {
      const response = await fetch(`${this._baseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const responseJson = await response.json();
      
      if (responseJson.error) {
        throw new Error(responseJson.message);
      }
      
      return responseJson;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  }

  async login(email, password) {
    try {
      const response = await fetch(`${this._baseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const responseJson = await response.json();
      
      if (responseJson.error) {
        throw new Error(responseJson.message);
      }
      
      // Simpan token ke localStorage
      localStorage.setItem('token', responseJson.loginResult.token);
      localStorage.setItem('user', JSON.stringify({
        id: responseJson.loginResult.userId,
        name: responseJson.loginResult.name,
      }));
      
      return responseJson.loginResult;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  isLoggedIn() {
    return !!localStorage.getItem('token');
  }

  getCurrentUser() {
    const userString = localStorage.getItem('user');
    if (!userString) return null;
    
    try {
      return JSON.parse(userString);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }
}

export default AuthModel;