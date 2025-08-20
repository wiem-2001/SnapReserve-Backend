  export const checkScratchCardEligibility = async (req, res) => {
    try {
      const  first_login_gift  = req.user.first_login_gift;
      const  welcome_gift_expiry = req.user.welcome_gift_expiry ;
      
      res.json({ 
        eligible: first_login_gift ,
        welcome_gift_expiry:welcome_gift_expiry,
        message: first_login_gift ? 'User is eligible for welcome gift' : 'User has already claimed welcome gift'
      });
    } catch (error) {
      console.error('Error checking scratch card eligibility:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };