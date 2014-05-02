(function() {
  var client_id = 'HVrYjiZfR1uaug026zYl26nFrwwJ6bei';
  return {
    events: {
      'app.activated':'onAppActivated',
      'click button.authenticate':'onAuthenticateClicked',
      'authenticateUser.fail':'authFailed',
      'click button.startSession':'onStartSessionClicked',
      'startSession.fail':'onSessionStart',

      'click .launch_session':'onLaunchSessionClicked',
      'click .logout':'logout'

    },
    requests: {
      authenticateUser: function(agentEmail, agentPwd) {
        return {
          url: helpers.fmt('https://api.citrixonline.com/oauth/access_token?grant_type=password&client_id=%@&user_id=%@&password=%@', client_id, agentEmail, agentPwd),
          type: 'GET',
          contentType: 'application/json',
          dataType: 'json',
          proxyv2: true
        };
      },
      startSession: function(requestData, headers) {
        return {
          url: 'https://api.citrixonline.com/G2A/rest/v1/sessions',
          type: 'POST',
          contentType: 'application/json',
          dataType: 'json',
          proxyv2: true,
          data: requestData,
          headers: headers
        };
      }
    },

    // ## NAMED FUNCTIONS
    onAppActivated: function(data) {
      if(data.firstLoad) {
        //load the app, authenticate the user, and switch to the template
        //pull credentials from localStorage
        var token = this.store('goToToken') || false;
        //if no creds switch to the login template
        if(!token) {
          var credentialsSaved = false,
            credentialsFailed = false;
          this.switchTo('login', {
            saved : credentialsSaved,
            failed: credentialsFailed
          });
          return;
        }
        // TODO if there is a token...
        // TODO verify the token by making an arbitray authenticated API call?


        // ...switch to the 'form' template if successful
        console.log("Token is stored: " + token);
        var ticket = this.ticket();
        var requester = ticket.requester();
        var email = requester.email();
        var name = requester.name();
        // console.log(email);
        // console.log(name);
        this.switchTo('form', {
          requesterEmail: email,
          requesterName: name
        });
      }
    },
    onAuthenticateClicked: function(e) {
      if(e) { e.preventDefault(); }

      // grab the creds from the login form
      var agentEmail = this.$('input.authenticateEmail').val();
      var agentPwd = this.$('input.authenticatePwd').val();

      // use the creds and authenticate into GoTo API
      this.ajax('authenticateUser', agentEmail, agentPwd).done( function(response) {
        //handle the response
        console.log(response.access_token);
        this.store( 'goToToken', response.access_token );

        var ticket = this.ticket();
        var requester = ticket.requester();
        var email = requester.email();
        var name = requester.name();
        this.switchTo('form', {
          requesterEmail: email,
          requesterName: name
        });

      });
    },
    authFailed: function(response) {
      var credentialsSaved = false;
      var credentialsFailed = true;
      this.switchTo('login', {
        saved : credentialsSaved,
        failed: credentialsFailed
      });
      // TODO add banner to the login form for failure
    },

    onStartSessionClicked: function(e) {
      if(e) { e.preventDefault(); }

      var ticket = this.ticket(),
        id = ticket.id();
      var account = this.currentAccount(),
        subdomain = account.subdomain();
      var userEmail = this.$('.userEmail').val();
      var userName = this.$('.userName').val();
      console.log(userEmail);

      var data = {
        sessionType: "screen_sharing",
        partnerObject: id,
        "partnerObjectUrl": helpers.fmt('https://%@.zendesk.com/tickets/%@', subdomain, id),
        customerName: userName,
        customerEmail: userEmail
      };
      var requestData = JSON.stringify(data);
      var token = this.store('goToToken');
      var headers = {
        Authorization: helpers.fmt("OAuth oauth_token='%@'", token)
      };
      console.log(headers);
      console.log("start session!");
      this.ajax("startSession", requestData, headers);
    },

    onSessionStart: function(response) {
      // var launch = response.startScreenSharing;
      // var launchURL = launch.launchUrl;


      this.switchTo('launch', {
        userName: 'Joe McCarron',
        userEmail: 'joe+it@zendesk.com',
        launchURL: 'http://example.com' //launchURL
      });
    },
    onLaunchSessionClicked: function(e) {
      // if(e) {e.preventDefault();}
      this.switchTo('inprogress', {
        userName: 'Joe McCarron',
        userEmail: 'joe+it@zendesk.com'
      });

    },

    logout: function(e) {
      if(e) {e.preventDefault();}

      this.store('goToToken', '');
      var credentialsSaved = false,
        credentialsFailed = false;
      this.switchTo('login', {
        saved : credentialsSaved,
        failed: credentialsFailed
      });
    }

  };

}());
