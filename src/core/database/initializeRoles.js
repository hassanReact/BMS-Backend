import AppDataSource from "./data-source.js";

const defaultRoles = [
  "SuperAdmin",
  "CompanyAdmin",
  "Owner",
  "Tenant",
  "Staff",
  "Agent",
];

const initializeRoles = async () => {
  const roleRepository = AppDataSource.getRepository("Role");

  for (const name of defaultRoles) {
    const existingRole = await roleRepository.findOne({
      where: { name },
    });

    if (!existingRole) {
      const role = roleRepository.create({ name });
      await roleRepository.save(role);
    }
  }

  console.log("✅ Default roles initialized successfully");
};

export default initializeRoles;