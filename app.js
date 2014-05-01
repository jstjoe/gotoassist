(function() {

  return {
    events: {
      'app.activated':'onAppActivated',

    },

    onAppActivated: function(data) {
      if(data.firstLoad) {
        //load the app, authenticate the user, and switch to the template
          //pull credentials from localStorage
          
            //if no creds switch to the login template
            var credentialsSaved = false,
              credentialsFailed = false;
            this.switchTo('login', {
              saved : credentialsSaved,
              failed: credentialsFailed
            });

      }
    }
  };

}());
