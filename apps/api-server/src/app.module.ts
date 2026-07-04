import { Module } from "@nestjs/common";
import { ClsPluginTransactional } from "@nestjs-cls/transactional";
import { ClsModule } from "nestjs-cls";
import { AdExecutionModule } from "./features/ad-execution/index.js";
import { DataExplorerModule } from "./features/data-explorer/index.js";
import { DashboardModule } from "./features/dashboard/index.js";
import { HealthModule } from "./features/health/index.js";
import { DatabaseModule, PgTypedTransactionalAdapter } from "./infra/database/index.js";

@Module({
  imports: [
    DatabaseModule,
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true
      },
      plugins: [
        new ClsPluginTransactional({
          imports: [DatabaseModule],
          adapter: new PgTypedTransactionalAdapter(),
          enableTransactionProxy: true
        })
      ]
    }),
    AdExecutionModule,
    DataExplorerModule,
    DashboardModule,
    HealthModule
  ]
})
export class AppModule {}
