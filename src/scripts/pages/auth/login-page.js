import AuthModel from '../../model/auth-model';

class LoginPage {
  constructor() {
    this._authModel = new AuthModel();
  }

  async render() {
    return `
      <section class="container login-container">
        <h1 class="login-title">Login</h2>
        <form id="loginForm" class="login-form">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required>
          </div>
          <div class="form-group">
            <button type="submit" class="login-button">Login</button>
          </div>
          <div id="loginMessage" class="message"></div>
          <div class="register-link">
            <p>Belum punya akun? <a href="#/register">Daftar di sini</a></p>
          </div>
        </form>
      </section>
    `;
  }

  async afterRender() {
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      try {
        loginMessage.textContent = 'Logging in...';
        loginMessage.classList.remove('error');
        
        await this._authModel.login(email, password);
        
        loginMessage.textContent = 'Login berhasil! Mengalihkan...';
        
        // Redirect ke halaman utama setelah login berhasil
        setTimeout(() => {
          window.location.hash = '#/stories';
        }, 1000);
      } catch (error) {
        loginMessage.textContent = `Login gagal: ${error.message}`;
        loginMessage.classList.add('error');
      }
    });
  }
}

export default LoginPage;