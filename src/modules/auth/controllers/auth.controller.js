class AuthController {
  constructor({ authService }) {
    this.authService = authService;
  }

  login = async (req, res, next) => {
    try {
      const data = await this.authService.login(req.body);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = AuthController;
