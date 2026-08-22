/** Shared between the fake Auth0 server and the specs that drive the sign-in UI. */
export const TEST_OTP_CODE = "424242";
export const FAKE_AUTH0_PORT = Number(process.env.FAKE_AUTH0_PORT ?? 4399);
export const FAKE_AUTH0_URL = `http://127.0.0.1:${FAKE_AUTH0_PORT}`;
