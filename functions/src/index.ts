import * as functions from 'firebase-functions';

// CAUTION!!! This gives this code full read/write rights from/to the Realtime Database.
import * as admin from 'firebase-admin'

import express, { Request, Response } from 'express';
import bodyParser from "body-parser";
import morgan from "morgan";

admin.initializeApp(functions.config().firebase);

const app = express();
const main = express();

main.use(morgan('combined'))

main.use('/', app);
main.use(bodyParser.json());

const webApi = functions.https.onRequest(main);

const asyncMiddleware = (fn: any) =>
  (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next))
      .catch(next);
  };

app.get('/coffee', asyncMiddleware(async (request: Request, response: Response) => {
    const snapshot = await admin.database().ref('/timestamped_measures').orderByChild("timestamp").limitToLast(1)
    .once('value')

    snapshot.forEach(childSnapshot => {
        const {value, timestamp} = childSnapshot.val();
        if(Date.now()-timestamp > 1000*60*5) {
            response.send(`Oops! Seems like the temperature hasn't updated in a while. Please fix it :pray: The latest update is from ${new Date(timestamp)}`);
        } else {
            if(value >= 50) {
                response.send(`The temperature of the coffee is currently ${parseFloat(value).toFixed(0)} °C :coffee_parrot: :feelsgoodman:`);
            } else {
                response.send(`No fresh coffee for you :feelsbadman:`);
            }
        }
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