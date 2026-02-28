# PetroApp Assesment

## Transfer Events API

A Dockerized Node.js + PostgreSQL API for processing transfer events with idempotent ingestion and concurrency-safe persistence.

## Tech Stack & Requirements:

Node.js (Express)

PostgreSQL 16

Docker + Docker Compose

Jest (testing)

## Requirements (Local Development)

If running locally without Docker:

Node.js 18+

npm

PostgreSQL 16+

If using Docker (recommended):

Docker

Docker Compose

-----------------------------------------------------------------------

## 2. Running With Docker (Recommended)

        docker compose up --build

- Starts PostgreSQL

- Runs init.sql (first time only)

- Builds the API container

- Starts the API on port 3000

- API will be available at: http://localhost:3000

Note: Running local ( without docker ) with 1 command is not supported. The reason is that it is not practical because of the database configuration. It would've made more sense and would've been supported if I went with an in-memeory solutiion. Running a shell script to download dependencies and start a posgtresql database seemed redundant when you can do that easily running the docker command above. 

-----------------------------------------------------------------------

## 3. How to run tests

        docker compose --profile test run test

Runs 2 test suites:

- transferEventsService.test.js => tests the service logic with stress on double insertion and concurrency and overlapping events in concurrent calls.

- transferEventsController.test.js => just an integration test.

-----------------------------------------------------------------------

## 4. API examples (curl)

Recommended: have git installed if you are on windows to be able to run this curl command. I was able to test this on GIT Bash. Powershell doesn't work.

### Endpoint 1 

POST /transfers

Example

    curl -X POST http://localhost:3000/transfers \
    -H "Content-Type: application/json" \
    -d '[
        {
        "event_id": "abc123",
        "station_id": "STATION_A",
        "amount": 100,
        "status": "approved"
        }
    ]'

Example Response

{
  "inserted": 1,
  "duplicates": 0,
  "invalid": 0
}

### Endpoint 2

GET /stations/:stationId/summary

Example

    curl http://localhost:3000/stations/STATION_A/summary

Example Response

{"station_id":"STATION_A","total_approved_amount":"450.00","events_count":"4"}

-----------------------------------------------------------------------

## 5. Design notes: idempotency strategy + concurrency strategy + tradeoffs

The implemented idempotency strategy is done with transactional insertion in the database. 
This was selected because:
- the database enforces idempotency through the unique key constraint. There can never be double insertion in the same bacth.
- Even with concurrency, PostgreSQL still guarantees the same outcome. 
- Scales really well, unlike any mutex mechanism that can be done in the application layer.

Some design notes and assumptions:

-  The events_count aggregation in the summary endpoint aggregates all transfer events even the not approved. The decision is done just because we can count. In my opinion this is not a "design" choice and it could've been "accepted" only count. Both are acheivable just fine.

- The POST endpoint operates in partial accept mode. Meaning, if a batch has 3 new event_ids and 1 duplicate => the duplicate will be rejected and the rest will be stored normally.

- As a part of partial acceptance, any invalid transfer event will be skipped and not ruin the batch. But it will be reported in the response as "invalid".

- Once a transfer event is saved, it CAN'T be modified even if the first time the status was rejected and the second trial it is approved. This is not something I'm personally a fan of but it satisfies the requirement: "If an event with the same event_id already exists, do not store/overwrite it.".

- The database is "swappable" as required. This was acheived by creating a service that handles the business logic and using the power of inversion of control and dependency injection. 

- Please notice that the aplication itself doesn't handle the idempotency, rather the database. Which means, any future replacement of the database has to satisfy the interfacte requirements and has to support ACID and offers the same unique key constrains offered by postregSQL.

- There is technically a secret key in the repo. It's the DB connection string which has the password in the docker-compose yml. I left it just because this helps making the deliverable runnable with 1 command easily for your testing purposes. Realistically, and for PROD applications. Any kind of key vault should be used. Azure key vaults for example.

- The API currently shows basic logs in the console for the user to understand what happens. I though about adding a logger that in fact saves the request with timestamps and what was returned. The reason I didn't implement that is because: designing a logging system needs to make sense. We need to know which data can be helpful when a down time happens. And what peices of information can be useful. Dumping the request/response in the files system seemed very pointless and arbitrary this is why I skipped this detail. But love to talk more about it!
