import * as functions from "firebase-functions";

// CAUTION!!! This gives this code full read/write rights from/to the Realtime Database.
import * as admin from "firebase-admin";

import express, { Request, Response } from "express";
import bodyParser from "body-parser";

const asyncMiddleware = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

admin.initializeApp();

const app = express();

app.use(bodyParser.json());

const webApi = functions.region("europe-west1").https.onRequest(app);

app.get(
  "/coffee",
  asyncMiddleware(async (request: Request, response: Response) => {
    if (
      request.query.token !==
      functions.config().wuffice_coffee.slack_command_token
    ) {
      response.status(401).send({ error: "Access denied" });
      return;
    }

    const snapshot = await admin
      .database()
      .ref("/timestamped_measures")
      .orderByChild("timestamp")
      .limitToLast(1)
      .once("value");

    snapshot.forEach(childSnapshot => {
      const { value, timestamp, distance } = childSnapshot.val();

      if (distance > 10) {
        response.send(
          `Seems like the coffee pot is not in place :feelsbadman: Check again later `
        );
        return;
      }

      if (Date.now() - timestamp > 1000 * 60 * 5) {
        response.send(
          `Oops! Seems like the temperature hasn't updated in a while. Please fix it :pray: The latest measurement is from ${new Date(
            timestamp
          )}`
        );
      } else {
        if (value >= 50) {
          response.send(
            `The temperature of the coffee is currently ${parseFloat(
              value
            ).toFixed(0)} °C :coffee_parrot: :feelsgoodman:`
          );
        } else {
          response.send(`No fresh coffee for you :feelsbadman:`);
        }
      }
    });
  })
);

const formatData = functions
  .region("europe-west1")
  .database.ref("/coffee1/temp/{pushId}/")
  .onCreate((snapshot, context) => {
    const original = snapshot.val();
    const pushId = context.params.pushId;

    console.log(
      `Detected new measure ${JSON.stringify(original)} with pushId ${pushId}`
    );

    return admin
      .database()
      .ref("timestamped_measures")
      .push({
        value: original.temp,
        distance: original.distance,
        timestamp: admin.database.ServerValue.TIMESTAMP
      });
  });

export { webApi, formatData };
