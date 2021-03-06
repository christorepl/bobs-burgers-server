const knex = require("knex");
const supertest = require("supertest");
const app = require("../src/app");
const { expect } = require("chai");
const helpers = require("./test-helper");
const { makeUsersArray } = require("./fixtures");

describe("Dash endpoint", function () {
  let db;

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DATABASE_URL,
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  before("clean the table", () =>
    db.raw("TRUNCATE bobsburgers_users RESTART IDENTITY CASCADE")
  );

  afterEach("cleanup", () =>
    db.raw("TRUNCATE bobsburgers_users RESTART IDENTITY CASCADE")
  );

  describe(`GET /dash/`, () => {
    context(`Given there are users in the database`, () => {
      const testUsers = makeUsersArray();

      beforeEach("insert user", () => {
        return db
          .into("bobsburgers_users")
          .insert(testUsers)
          .then(() => {
            return db.into("bobsburgers_users").insert(testUsers);
          });
      });

      it(`responds with 200 and all the users`, () => {
        return supertest(app).get("/dash/").expect(200, testUsers);
      });
    });
  });

  describe(`DELETE /dash/user/:id`, () => {
    context(`Given no account`, () => {
      it(`responds with 404`, () => {
        const id = 1234;
        return supertest(app)
          .delete("/dash/user/${id}")
          .expect(404, { error: { massage: `User doesn't exist` } });
      });
    });

    context(`Given there is a user in the database`, () => {
      const testUsers = makeUsersArray();

      beforeEach("insert user", () => {
        return db
          .into("bobsburgers_users")
          .insert(testUsers)
          .then(() => {
            return db.into("bobsburgers_users").insert(testUsers);
          });
      });

      it(`responds with 204 and removes user`, () => {
        const idToRemove = 1;
        const expectedUser = testUsers.filter(
          (contact) => contact.id !== idToRemove
        );
        return supertest(app)
          .delete("/dash/user/${idToRemove}")
          .expect(204)
          .then((res) => supertest(app).get(`/dash/user`).expect(expectedUser));
      });
    });
  });

  describe(`PATCH /dash/user/:id`, () => {
    context(`Given no user`, () => {
      it(`responds with 404`, () => {
        const id = 654321;
        return supertest(app)
          .delete(`/dash/user/${id}`)
          .expect(404, { error: { message: `User doesn't exist` } });
      });
    });

    context(`Given there is a user in the database`, () => {
      const testUsers = makeUsersArray();

      beforeEach("insert user", () => {
        return db
          .into("bobsburgers_user")
          .insert(testUsers)
          .then(() => {
            return db.into("bobsburgers_user").insert(testUsers);
          });
      });

      it(`responds with 204 and updates the contact`, () => {
        const idToUpdate = 1;
        const updatedUser = {
          password: "123",
        };

        const expectedUser = {
          ...testUsers[idToUpdate - 1],
          ...updatedUser,
        };

        return supertest(app)
          .patch(`/dash/user/${idToUpdate}`)
          .send(updatedUser)
          .expect(204)
          .then((res) =>
            supertest(app).get(`/dash/user/${idToUpdate}`).expect(expectedUser)
          );
      });
      it(`responds with 400 when no required field supplied`, () => {
        const idToUpdate = 1;
        return supertest(app)
          .patch(`/dash/user/${idToUpdate}`)
          .send({ irrelevantField: "bar" })
          .expect(400, {
            error: {
              message: `Request body must contain either 'password'`,
            },
          });
      });
      it(`responds with 204 when updating only a subset of fields`, () => {
        const idToUpdate = 1;
        const updatedUser = {
          name: "foo",
        };
        const expectedUser = {
          ...testUser[idToUpdate - 1],
          ...updatedUser,
        };

        return supertest(app)
          .patch(`/dash/user/${idToUpdate}`)
          .send({
            ...updatedUser,
            fieldToIgnore: "should not be in GET response",
          })
          .expect(204)
          .then((res) =>
            supertest(app).get(`/dash/user/${idToUpdate}`).expect(expectedUser)
          );
      });
    });
  });
});
