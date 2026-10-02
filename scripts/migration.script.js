import fs from "fs";
import path from "path";

const name = process.argv[2];

if (!name) {
  console.error("Please provide a migration name.");
  console.error("Example: npm run create:migration -- AddAgentRelationToComplaints");
  process.exit(1);
}

const timestamp = Date.now();
const fileName = `${timestamp}-${name}.js`;
const filePath = path.join("src/migration", fileName);
const className = `${name}${timestamp}`;

const content = `export class ${className} {
  async up(queryRunner) {
  }

  async down(queryRunner) {
  }
}
`;

fs.writeFileSync(filePath, content);

console.log(`Migration created: ${filePath}`);
