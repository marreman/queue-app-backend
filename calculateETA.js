var Firebase = require('firebase');

var root = new Firebase('https://queue-app-dev.firebaseio.com/')
  , locations = root.child('locations')
  , queueSessions = root.child('queueSessions')
  , beacons = []
  , ONE_HOUR_IN_MILLISECONDS = 60 * 60 * 60 * 1000;

function Beacon(beaconId) {
  this.id = beaconId;

  locations.child(this.id).child('etaHistoryTimeLimit').on('value', function (snap) {
    this.etaHistoryTimeLimit = snap.val() || ONE_HOUR_IN_MILLISECONDS;
    queueSessions.child(this.id).off();
    queueSessions.child(this.id).on('value', this.onSessionsUpdated, this);
  }, this);
}

Beacon.prototype.onSessionsUpdated = function (snap) {
  var estimatedQueueTime = this.calculateETA(snap.val());
  locations
    .child(this.id + '/currentStatus/estimatedQueueTime')
    .set(estimatedQueueTime);
};

Beacon.prototype.calculateETA = function (sessionEntries) {
  var eta
    , sumOfEntries = 0
    , numberOfEntries = 0
    , timeLimit = new Date().getTime() - this.etaHistoryTimeLimit;

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
      }
    }
  }

  eta = (sumOfEntries / numberOfEntries).toFixed();
  return numberOfEntries ? eta : null;
};

queueSessions.on('child_added', function (snap) {
  var beacon = new Beacon(snap.name());
  beacons.push(beacon);
});
