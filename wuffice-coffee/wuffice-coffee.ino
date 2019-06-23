#include <FirebaseESP8266.h>
#include <ESP8266WiFi.h>
#include <Wire.h>
#include <Adafruit_MLX90614.h>
#include <ArduinoJson.h>

Adafruit_MLX90614 mlx = Adafruit_MLX90614();

#define FIREBASE_HOST ""
#define FIREBASE_AUTH ""
#define WIFI_SSID ""
#define WIFI_PASSWORD ""

#define echoPin D6
#define trigPin D7

unsigned long check_wifi = 30000;

long duration, distance; // Duration used to calculate distance

FirebaseData firebaseData;

void setup()
{

  Serial.begin(115200);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED)
  {
    Serial.print(".");
    digitalWrite(BUILTIN_LED, HIGH);
    delay(1000);
    digitalWrite(BUILTIN_LED, LOW);
  }
  Serial.println();
  Serial.print("Connected with IP: ");
  Serial.println(WiFi.localIP());
  Serial.println();

  Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);
  Firebase.reconnectWiFi(true);

  mlx.begin(); 

  pinMode(BUILTIN_LED, OUTPUT);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);

  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  duration = pulseIn(echoPin, HIGH);
  //Calculate the distance (in cm) based on the speed of sound.
  distance = duration / 58.2;
  Serial.println(distance);

}

void loop()
{

  if ((WiFi.status() != WL_CONNECTED) && (millis() > check_wifi)) {
    digitalWrite(BUILTIN_LED, HIGH);
    delay(1000);
    digitalWrite(BUILTIN_LED, LOW);
    Serial.println("Reconnecting to WiFi...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    check_wifi = millis() + 30000;
  }

  if (WiFi.status() == WL_CONNECTED) {
    float objTemp = mlx.readObjectTempC();
    
    Serial.print(objTemp);
    Serial.println("*C");

    /* The following trigPin/echoPin cycle is used to determine the distance of the nearest object by bouncing soundwaves off of it. */
    digitalWrite(trigPin, LOW);
    delayMicroseconds(2);
    digitalWrite(trigPin, HIGH);
    delayMicroseconds(10);
    digitalWrite(trigPin, LOW);
    duration = pulseIn(echoPin, HIGH);
    //Calculate the distance (in cm) based on the speed of sound.
    distance = duration / 58.2;
    Serial.println(distance);

    StaticJsonDocument<200> doc;
    doc["temp"] = objTemp;
    doc["distance"] = distance;

    String jsonData;
    serializeJson(doc, jsonData);

    Firebase.pushJSON(firebaseData, "/coffee1/temp", jsonData);

    delay(1000 * 60);
    //delay(1000 * 10);
  }
}
