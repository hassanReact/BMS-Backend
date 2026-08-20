import Role from "../../models/role.model.js";

const defaultRoles = [
  "CompanyAdmin",
  "Owner",
  "Tenant",
  "Staff",
  "Agent",
];

const initializeRoles = async () => {
  await Role.bulkWrite(
    defaultRoles.map((name) => ({
      updateOne: {
        filter: { name },
        update: { $setOnInsert: { name } },
        upsert: true,
      },
    }))
  );

  console.log("✅ Default roles initialized successfully");
};

export default initializeRoles;