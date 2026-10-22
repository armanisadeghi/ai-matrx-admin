import { onePerPerson } from "../service";

it("a person the door lists twice shows once in the mention picker", () => {
  const admin = { userId: "u1", name: "admin", email: "admin@admin.com", avatarUrl: null };
  const other = { userId: "u2", name: "Other", email: null, avatarUrl: null };
  expect(onePerPerson([admin, other, { ...admin }])).toEqual([admin, other]);
});
