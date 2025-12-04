import express from 'express';
import corsConfig from './src/core/config/cors.js';
import connectDB from './src/core/database/connection.js';
import globalExceptionHandler from './src/utils/globalException.js';
import logger from './src/core/config/logger.js';
import "dotenv/config"
import responseInterceptor from './src/utils/responseInterceptor.js';
import vendorRoutes from './src/routes/vendor.routes.js';
// asfafasdf
// import userRouter from './src/routes/user.routes.js';
import propertyRouter from './src/routes/property.routes.js';
import inventoryRoutes from './src/routes/inventory.routes.js';
import bookingRoutes from './src/routes/booking.routes.js';
import staffRoutes from './src/routes/staff.routes.js';
import tenantRoutes from'./src/routes/tenant.routes.js';
import userRoutes from './src/routes/user.routes.js';
import companyRoutes from './src/routes/company.routes.js';
import ownerRoutes from './src/routes/owner.routes.js';
import complainRoutes from './src/routes/complain.routes.js';
import typeRoutes from './src/routes/type.routes.js';
import billRoutes from './src/routes/bill.routes.js';
import serviceProviderRoutes from './src/routes/serviceProvider.routes.js';
import projectRoutes from './src/routes/project.routes.js';
import blockRoutes from './src/routes/block.routes.js';
import maintenanceRoutes from './src/routes/maintenance.routes.js'
import transactionalAccountsRoutes from './src/routes/transactionalAccounts.routes.js'
import accountsPayableRoutes from './src/routes/accountsPayable.routes.js'
import path from "path";
import AnnouncementRoutes from './src/routes/announcment.routes.js';
import extraChargeRoutes from "./src/routes/extracharge.routes.js";
import subscriptionRoutes from './src/routes/subscricription.routes.js'
import logoRoutes from './src/routes/logo.routes.js'
import agentRoutes from './src/routes/agents.route.js'
import commentRoutes from './src/routes/comments.route.js'
import voucherCounterRoutes from './src/routes/voucherCounter.route.js'
import accountReceiveableRoutes from './src/routes/accounts.Receiveable.routes.js'
import voucherRoutes from './src/routes/voucher.routes.js'
import systemRoutes from './src/routes/system.routes.js'
import { ensureSuperAdminExists } from './src/middlewares/ensureSuperAdmin.middleware.js'
import generalVoucherRoutes from './src/routes/generalVoucher.routes.js'
import unifiedVoucherRoutes from './src/routes/UnifiedVoucher.routes.js'

const app = express();
const PORT = (() => { 
    // const env = process.env.ENV;
    // return env === 'development' ? 7200 : 4545;
    return process.env.PORT; 
})();

app.use(express.json());
app.use(corsConfig);

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use((req, res, next) => {
    logger.info(`Incoming request: ${req.method} ${req.originalUrl}`);
    next();
});

// await mongoose.connect('mongodb+srv://rental_property:rental_property%40samyotech2024@cluster0.kv1f8.mongodb.net/rms?retryWrites=true&w=majority&appName=Cluster0')
console.log('database connected successfully');
connectDB()
    .then(() => {
        logger.info('Database connected successfully');
    })
    .catch((err) => {
        logger.error(`Database connection failed: ${err.message}`);
    });

app.use(responseInterceptor);

app.use('/api/v1/system', systemRoutes);
app.use(ensureSuperAdminExists);
// sdafasdfa
// app.use('/api/v1/user', userRouter)
app.use('/api/v1/complain', complainRoutes);
app.use('/api/v1/accountsReceiveable', accountReceiveableRoutes);
app.use('/api/v1/generalVoucher', generalVoucherRoutes);
app.use('/api/v1/voucherCounter', voucherCounterRoutes);
app.use('/api/v1/voucher', voucherRoutes);
app.use('/api/v1/agents', agentRoutes);
app.use('/api/v1/vendor', vendorRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/property', propertyRouter);
app.use('/api/v1/bill', billRoutes);
app.use('/api/v1/booking', bookingRoutes)
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/comments', commentRoutes);
app.use('/api/v1/tenant', tenantRoutes);
app.use('/api/v1/owner', ownerRoutes);
app.use('/api/v1/company', companyRoutes);
app.use('/api/v1/types', typeRoutes);
app.use('/api/v1/user', userRoutes);
app.use('/api/v1/serviceProvider', serviceProviderRoutes);
app.use('/api/v1/project', projectRoutes);
app.use('/api/v1/block', blockRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/transactionalAccounts', transactionalAccountsRoutes);
app.use('/api/v1/accountsPayable', accountsPayableRoutes);
app.use('/api/v1/announcement', AnnouncementRoutes);
app.use('/api/v1/extraCharge', extraChargeRoutes);
app.use('/api/v1/subscription', subscriptionRoutes);
app.use('/api/v1/logo', logoRoutes);
app.use('/api/v1/unified-vouchers', unifiedVoucherRoutes);

app.use(globalExceptionHandler);

app.listen(PORT, () => {
    logger.info(`Server is running at port ${PORT}`);
    console.log(`Server is running at port ${PORT}`);
});
