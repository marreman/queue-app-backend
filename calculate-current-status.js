var Firebase = require('firebase');

var root = new Firebase('https://queue-app.firebaseio.com/')
  , locations = root.child('locations')
  , queueSessions = root.child('queueSessions')
  , beacons = []
  , ONE_HOUR = 60 * 60;

function getCurrentUnixTimestamp() {
  return (new Date().getTime() / 1000).toFixed();
}

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
  var result = {
      estimatedQueueTime: null,
      numberOfFemales: 0,
      numberOfMales: 0,
      numberOfTrans: 0,
      totalNumberOfVisitors: 0
    }
    , sumOfEntries = 0
    , numberOfEntries = 0
    , oneHourAgo = getCurrentUnixTimestamp() - ONE_HOUR;

  if (!sessionEntries) {
    return null;
  }

  for (var name in sessionEntries) {
    var session = sessionEntries[name]
      , queueTime = session.end - session.start;

    if (session.end < oneHourAgo || queueTime < 0) {
      continue;
    }

    sumOfEntries += queueTime;
    numberOfEntries++;

    if (!session.gender) {
      continue;
    }

    switch (session.gender) {
      case 'male': result.numberOfMales++; break;
      case 'female': result.numberOfFemales++; break;
      case 'trans': result.numberOfTrans++; break;
    }

    result.totalNumberOfVisitors++;
  }

  result.estimatedQueueTime = numberOfEntries ?
      (sumOfEntries / numberOfEntries).toFixed() : null;

  return result;
};

queueSessions.on('child_added', function (snap) {
  var beacon = new Beacon(snap.name());
  beacons.push(beacon);
});
