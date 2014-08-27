var Firebase = require('firebase');

var root = new Firebase('https://queue-app.firebaseio.com/')
  , locations = root.child('locations')
  , queueSessions = root.child('queueSessions')
  , beacons = []
  , TIME_LIMIT = 60 * 60 * 60 * 1000; //ONE HOUR IN MILLISECONDS

function Beacon(beaconId) {
  this.id = beaconId;
  this.fbRef = queueSessions.child(this.id);
  this.fbRef.off();
  this.fbRef.on('value', this.onSessionsUpdated, this);
}

Beacon.prototype.onSessionsUpdated = function (snap) {
  var currentStatus = this.calculateCurrentStatus(snap.val());
  locations.child(this.id + '/currentStatus').set(currentStatus);
};

Beacon.prototype.calculateCurrentStatus = function (sessionEntries) {
  var estimatedQueueTime
    , sumOfEntries = 0
    , numberOfEntries = 0
    , numberOfFemales = 0
    , numberOfTrans = 0
    , numberOfMales = 0
    , timeLimit = new Date().getTime() - TIME_LIMIT;

  if (!sessionEntries) {
    return null;
  }

  for (var name in sessionEntries) {
    var session = sessionEntries[name]
      , queueTime;

    if (session.end > timeLimit) {
      queueTime = session.end - session.start;

      if (queueTime > 0) {
        sumOfEntries += queueTime;
        numberOfEntries++;
        if (session.gender === 'male') numberOfMales++;
        else if (session.gender === 'female') numberOfFemales++;
        else if (session.gender === 'trans') numberOfTrans++;
      }
    }
  }

  estimatedQueueTime = (sumOfEntries / numberOfEntries).toFixed();

  return {
    estimatedQueueTime: numberOfEntries ? estimatedQueueTime : null,
    numberOfFemales: numberOfMales,
    numberOfMales: numberOfMales,
    numberOfTrans: numberOfTrans
  };
};

queueSessions.on('child_added', function (snap) {
  var beacon = new Beacon(snap.name());
  beacons.push(beacon);
});
