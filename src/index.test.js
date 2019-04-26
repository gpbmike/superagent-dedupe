import nock from "nock";
import superagent from "superagent";
import dedupe from "./index";

describe("dedupe", () => {
  const request = superagent.agent().use(dedupe);
  const apiUrl = "http://endpoint.dev";

  describe("GET", () => {
    const callback = jest.fn();

    const endpoint = nock(apiUrl)
      .persist()
      .get(() => true) // any get request
      .query(true) // any query params
      .delay(5) // we need requests to be "in-flight" to throttle
      .reply(() => {
        callback();
        return [200, "data"];
      });

    beforeEach(() => {
      callback.mockReset();
    });

    afterAll(() => {
      endpoint.persist(false);
    });

    it("should only make one GET request to endpoint", () =>
      Promise.all([
        request.get(`${apiUrl}/foo`),
        request.get(`${apiUrl}/foo`)
      ]).then(data => {
        expect(data.map(({ text }) => text)).toEqual(["data", "data"]);
        expect(callback).toHaveBeenCalledTimes(1);
      }));

    it("should make MULTIPLE GET requests with endpoint change", () =>
      Promise.all([
        request.get(`${apiUrl}/dog`),
        request.get(`${apiUrl}/cat`)
      ]).then(data => {
        expect(data.map(({ text }) => text)).toEqual(["data", "data"]);
        expect(callback).toHaveBeenCalledTimes(2);
      }));

    it("should make MULTIPLE GET requests with query change", () =>
      Promise.all([
        request.get(`${apiUrl}/foo`).query({ name: "action" }),
        request.get(`${apiUrl}/foo`).query({ name: "mike" })
      ]).then(data => {
        expect(data.map(({ text }) => text)).toEqual(["data", "data"]);
        expect(callback).toHaveBeenCalledTimes(2);
      }));

    it("should make MULTIPLE GET requests if the first request finishes", () => {
      const noDelayEndpoint = nock(apiUrl)
        .persist()
        .get("/no-delay")
        .reply(() => {
          callback();
          return [200, "data"];
        });

      return request
        .get(`${apiUrl}/no-delay`)
        .then(first =>
          request.get(`${apiUrl}/no-delay`).then(second => [first, second])
        )
        .then(data => {
          expect(data.map(({ text }) => text)).toEqual(["data", "data"]);
          expect(callback).toHaveBeenCalledTimes(2);
          noDelayEndpoint.persist(false);
        });
    });
  });

  describe("POST", () => {
    const callback = jest.fn();

    const endpoint = nock(apiUrl)
      .persist()
      .post(() => true) // any get request
      .delay(5) // we need requests to be "in-flight" to throttle
      .reply(() => {
        callback();
        return [200, "data"];
      });

    beforeEach(() => {
      callback.mockReset();
    });

    afterAll(() => {
      endpoint.persist(false);
    });

    it("should make multiple POST requests to endpoint", () =>
      Promise.all([
        request.post(`${apiUrl}/foo`),
        request.post(`${apiUrl}/foo`)
      ]).then(data => {
        expect(data.map(({ text }) => text)).toEqual(["data", "data"]);
        expect(callback).toHaveBeenCalledTimes(2);
      }));
  });
});
