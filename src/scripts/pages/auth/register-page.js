import AuthModel from '../../model/auth-model';

class RegisterPage {
  constructor() {
    this._authModel = new AuthModel();
  }

  async render() {
    return `
      <section class="container register-container">
        <h1 class="register-title">Register</h2>
        <form id="registerForm" class="register-form">
          <div class="form-group">
            <label for="name">Nama</label>
            <input type="text" id="name" name="name" required>
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required minlength="8">
            <small>Password minimal 8 karakter</small>
          </div>
          <div class="form-group">
            <button type="submit" class="register-button">Daftar</button>
          </div>
          <div id="registerMessage" class="message"></div>
          <div class="login-link">
            <p>Sudah punya akun? <a href="#/login">Login di sini</a></p>
          </div>
        </form>
      </section>
    `;
  }

  async afterRender() {
    const registerForm = document.getElementById('registerForm');
    const registerMessage = document.getElementById('registerMessage');

    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      const name = document.getElementById('name').value;
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      
      try {
        registerMessage.textContent = 'Mendaftarkan akun...';
        registerMessage.classList.remove('error');
        
        await this._authModel.register(name, email, password);
        
        registerMessage.textContent = 'Registrasi berhasil! Silakan login.';
        
        // Redirect ke halaman login setelah registrasi berhasil
        setTimeout(() => {
          window.location.hash = '#/login';
        }, 2000);
      } catch (error) {
        registerMessage.textContent = `Registrasi gagal: ${error.message}`;
        registerMessage.classList.add('error');
      }
    });
  }
}

export default RegisterPage;