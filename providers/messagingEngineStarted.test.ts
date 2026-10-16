import { subscribeEngineStart } from "./messagingEngineStarted";

function engine() {
  let started = false;
  return {
    start: async () => {
      if (started) return;
      started = true;
    },
    isStarted: () => started,
  };
}

test("a reader hears the moment the engine first starts, once", async () => {
  const e = engine();
  let heard = 0;
  const off = subscribeEngineStart(e, () => heard++);
  expect(heard).toBe(0);
  await e.start();
  expect(heard).toBe(1);
  expect(e.isStarted()).toBe(true);
  await e.start();
  expect(heard).toBe(1);
  off();
});

test("an unsubscribed reader hears nothing; a second reader on the same engine does not re-wrap it", async () => {
  const e = engine();
  let a = 0;
  let b = 0;
  const offA = subscribeEngineStart(e, () => a++);
  const wrapped = e.start;
  subscribeEngineStart(e, () => b++);
  expect(e.start).toBe(wrapped);
  offA();
  await e.start();
  expect(a).toBe(0);
  expect(b).toBe(1);
});
