import * as functions from 'firebase-functions';

// CAUTION!!! This gives this code full read/write rights from/to the Realtime Database.
import * as admin from 'firebase-admin'

import * as express from 'express';
import * as bodyParser from "body-parser";

admin.initializeApp(functions.config().firebase);

const app = express();
const main = express();

main.use('/', app);
main.use(bodyParser.json());

const webApi = functions.https.onRequest(main);

const asyncMiddleware = (fn: any) =>
  (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
  };

app.get('/coffee', asyncMiddleware(async (request: any, response: any) => {
    const snapshot = await admin.database().ref('/timestamped_measures').orderByChild("timestamp").limitToLast(1)
    .once('value')

    snapshot.forEach(childSnapshot => {
        const value = childSnapshot.val();
        response.send(`The temperature of the coffee is currently ${parseFloat(value.value).toFixed(0)} °C`);
    });
}))

const formatData = functions.database.ref('/coffee1/temp/{pushId}/')
    .onCreate(
        (snapshot, context) => {
            const original = snapshot.val();
            const pushId = context.params.pushId;

            console.log(`Detected new measure ${original} with pushId ${pushId}`);

            return admin.database().ref('timestamped_measures').push({
                value: original,
                timestamp: admin.database.ServerValue.TIMESTAMP
            });
        });

export {
    webApi,
    formatData
}