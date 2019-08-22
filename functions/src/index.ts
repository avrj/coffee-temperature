import * as functions from "firebase-functions";
import axios from "axios";

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

const webApi = functions.https.onRequest(app);

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

    const responseUrl = request.query.response_url;

    response.sendStatus(200);

    const snapshot = await admin
      .database()
      .ref("/timestamped_measures")
      .orderByChild("timestamp")
      .limitToLast(1)
      .once("value");

    let text = "";

    snapshot.forEach(childSnapshot => {
      const { value, timestamp, distance } = childSnapshot.val();

      if (distance > 10) {
        text = `Seems like the coffee pot is not in place :feelsbadman: Check again later `;
      } else {
        if (Date.now() - timestamp > 1000 * 60 * 5) {
          text = `Oops! Seems like the temperature hasn't updated in a while. Please fix it :pray: The latest measurement is from ${new Date(
            timestamp
          )}`;
        } else {
          if (value >= 50) {
            text = `The temperature of the coffee is currently ${parseFloat(
              value
            ).toFixed(0)} °C :coffee_parrot: :feelsgoodman:`;
          } else {
            text = `No fresh coffee for you :feelsbadman:`;
          }
        }
      }
    });

    await axios.post(responseUrl, { text });
  })
);

const formatData = functions.database
  .ref("/coffee1/temp/{pushId}/")
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
