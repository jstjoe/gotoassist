(function() {
  var client_id = 'HVrYjiZfR1uaug026zYl26nFrwwJ6bei';
  return {
    events: {
      'app.created':'start',
      'click button.authenticate':'onAuthenticateClicked',
      'authenticateUser.fail':'authFailed',
      'click button.startSession':'onStartSessionClicked',
      'startSession.fail':'onStartSessionFail',

      'click .launch_session':'onLaunchSessionClicked',
      'click .list_sessions':'getSessions',
      'click .refresh':'getSessions',
      'click .session':'selectSession',
      'click .logout':'logout',
      'click .cancel':'reset',
      'click .save':'saveSessionToTicket'
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
      startSession: function(requestData, headers, userName, userEmail) {
        return {
          url: 'https://api.citrixonline.com/G2A/rest/v1/sessions',
          type: 'POST',
          contentType: 'application/json',
          dataType: 'json',
          proxyv2: true,
          data: requestData,
          headers: headers,
          success: function(response) { this.onSessionStart(response, userName, userEmail);}
        };
      },
      getSessions: function(headers, fromDate, toDate) {
        return {
          url: helpers.fmt('https://api.citrixonline.com/G2A/rest/v1/sessions?sessionType=screen_sharing&fromTime=%@&toTime=%@', fromDate, toDate),
          type: 'GET',
          contentType: 'application/json',
          dataType: 'json',
          proxyv2: true,
          headers: headers,
          success: function(response) { this.gotSessions(response, fromDate, toDate);}
        };
      }
    },

    // ## NAMED FUNCTIONS
    start: function() {
        //load the app, authenticate the user, and switch to the template
        //pull credentials from localStorage
        var token = this.store('goToToken') || false;
        //if no creds switch to the login template
        if(!token) {
          // var credentialsSaved = false,
          //   credentialsFailed = false;
          this.switchTo('login', {
            // saved : credentialsSaved,
            // failed: credentialsFailed
          });
          return;
        }
        // TODO if there is a token...
        // TODO verify the token by making an arbitray authenticated API call?


        // ...switch to the 'form' template if successful
        var ticket = this.ticket(),
          requester = ticket.requester(),
          email = requester.email(),
          name = requester.name();

        this.switchTo('form', {
          requesterEmail: email,
          requesterName: name
        });
    },
    onAuthenticateClicked: function(e) {
      if(e) { e.preventDefault(); }

      // grab the creds from the login form
      var agentEmail = this.$('input.authenticateEmail').val();
      var agentPwd = this.$('input.authenticatePwd').val();

      // use the creds and authenticate into GoTo API
      this.ajax('authenticateUser', agentEmail, agentPwd).done( function(response) {
        //handle the response
        this.store( 'goToToken', response.access_token );
        services.notify("Authenticated to GoToAssist. You will stay logged-in on this computer until you click the 'Logout' button or the token is otherwise removed.");
        var ticket = this.ticket(),
          requester = ticket.requester(),
          email = requester.email(),
          name = requester.name();
        this.switchTo('form', {
          requesterEmail: email,
          requesterName: name
        });

      });
    },
    authFailed: function(response) {
      // var credentialsSaved = false;
      // var credentialsFailed = true;
      services.notify("Authentication failed. Please try again or check your credentials.", "error");
      this.switchTo('login', {
        // saved : credentialsSaved,
        // failed: credentialsFailed
      });
      // TODO add banner to the login form for failure
    },

    onStartSessionClicked: function(e) {
      if(e) { e.preventDefault(); }

      var ticket = this.ticket(),
        id = ticket.id(),
        account = this.currentAccount(),
        subdomain = account.subdomain(),
        userEmail = this.$('.userEmail').val(),
        userName = this.$('.userName').val(),
        data = {
          sessionType: "screen_sharing",
          partnerObject: id,
          partnerObjectUrl: helpers.fmt('https://%@.zendesk.com/tickets/%@', subdomain, id),
          customerName: userName,
          customerEmail: userEmail
        },
        requestData = JSON.stringify(data),
        token = this.store('goToToken'),
        headers = {Authorization: helpers.fmt("OAuth oauth_token=%@", token)};
      this.ajax("startSession", requestData, headers, userName, userEmail);
    },

    onSessionStart: function(response, userName, userEmail) {
      this.switchTo('launch', {
        userName: userName,
        userEmail: userEmail,
        launchURL: response.startScreenSharing.launchUrl //launchURL
      });
    },
    onLaunchSessionClicked: function(e) {
      this.$('.action').html('<button class="list_sessions btn btn-primary pull-right">Get Sessions</button>');
      var now = new Date();
      this.launchedTime = new Date();
      this.launchedTime.setMinutes(now.getMinutes() - 1);
    },
    getSessions: function(e) {
      if(e) {e.preventDefault();}
      var now = new Date();
      now.setSeconds(now.getSeconds() - 10);
      var toJSON = now.toJSON(),
        toDate = toJSON.substring(0,19)+"Z",
        fromJSON = this.launchedTime.toJSON(),
        fromDate = fromJSON.substring(0,19)+"Z",
        token = this.store('goToToken'),
        headers = {
        Authorization: helpers.fmt("OAuth oauth_token=%@", token)
      };
      this.ajax('getSessions', headers, fromDate, toDate);
    },
    gotSessions: function(response, date) {
      var sessions = response.sessions;
      this.sessions = sessions;
      if (sessions.length == 1 && sessions[0].status == 'complete') {
        var session = sessions[0];
        this.sessionComplete(session);
      } else {
        _.each(sessions, function(session){
          session.startedAt = new Date(session.startedAt);
          session.startedAt = session.startedAt.toLocaleString();
          if(session.customerJoinedAt) {
            session.customerJoinedAt = new Date (session.customerJoinedAt);
            session.customerJoinedAt = session.customerJoinedAt.toLocaleString();
          }
          if(session.endedAt) {
            session.endedAt = new Date(session.endedAt);
            session.endedAt = session.endedAt.toLocaleString();
          }
        });
        this.switchTo('listSessions', {
          sessions: sessions
        });
      }
    },
    selectSession: function(e) {
      // user clicked a session, grab it's ID and GET the session info...
      // or just grab it from a variable (stored elsewhere)?
      var position = this.$(e.currentTarget).data("arrayposition"),
        session = this.sessions[position];
      this.sessionComplete(session);
    },
    sessionComplete: function(session) {
      // process a single session's data and switchTo the 'complete' template with it
      var start = Date.parse(session.customerJoinedAt),
        end = Date.parse(session.endedAt),
        ms = end - start,
        minutes = (ms/1000/60) << 0,
        seconds = (ms/1000) % 60;
        seconds = seconds.toString();
      session.minutes = minutes;
      session.seconds = seconds;
      session.startedAt = new Date(session.startedAt);
      session.startedAt = session.startedAt.toLocaleString();
      session.customerJoinedAt = new Date (session.customerJoinedAt);
      session.customerJoinedAt = session.customerJoinedAt.toLocaleString();
      session.endedAt = new Date(session.endedAt);
      session.endedAt = session.endedAt.toLocaleString();
      this.session = session;
      this.switchTo('complete', {
        session: session
      });
    },
    saveSessionToTicket: function() {
      var sessionInfo = this.$('.completed_session').text();
      this.comment().text(sessionInfo);
      this.comment().type('internalNote');
    },
    logout: function(e) {
      if(e) {e.preventDefault();}
      this.store('goToToken', '');
      this.switchTo('login', {
      });
    },
    reset: function(e) {
      if(e) {e.preventDefault();}
      this.start();
    }
  };

}());
