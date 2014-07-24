var Firebase = require('firebase');

var root = new Firebase('https://queue-app.firebaseio.com/')
  , locations = root.child('locations')
  , queueSessions = root.child('queueSessions')
  , beacons = [];

function Beacon(beaconId) {
  this.id = beaconId;
  queueSessions.child(this.id).on('value', this.onSessionsUpdated, this);
}

Beacon.prototype.onSessionsUpdated = function (snap) {
  var eta = this.calculateETA(snap.val());
  locations.child(this.id).child('eta').set(eta)
};

Beacon.prototype.calculateETA = function (sessionEntries) {
  var eta
    , sumOfEntries = 0
    , numberOfEntries = 0;

  if (!sessionEntries) {
    return null;
  }

  numberOfEntries = Object.keys(sessionEntries).length;

  for (var name in sessionEntries) {
    var session = sessionEntries[name]
      , diff = session.end - session.start;

    sumOfEntries += diff;
  }

  eta = (sumOfEntries / numberOfEntries).toFixed();
  return eta;
};

queueSessions.on('child_added', function (snap) {
  var beacon = new Beacon(snap.name(), snap.val());
  beacons.push(beacon);
});
