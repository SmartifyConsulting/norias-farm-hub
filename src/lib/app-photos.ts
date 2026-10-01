import farm from "@/assets/apps/farm.jpg";
import animals from "@/assets/apps/animals.jpg";
import health from "@/assets/apps/health.jpg";
import diary from "@/assets/apps/diary.jpg";
import harvest from "@/assets/apps/harvest.jpg";
import fields from "@/assets/apps/fields.jpg";
import stock from "@/assets/apps/stock.jpg";
import tasks from "@/assets/apps/tasks.jpg";
import crops from "@/assets/apps/crops.jpg";
import treatments from "@/assets/apps/treatments.jpg";
import maintenance from "@/assets/apps/maintenance.jpg";
import finance from "@/assets/apps/finance.jpg";
import team from "@/assets/apps/team.jpg";
import intel from "@/assets/apps/intel.jpg";

export const APP_PHOTOS: Record<string, string> = {
  farm, animals, health, diary, harvest, fields, stock, tasks, crops, treatments, maintenance, finance, team,
  "/passport": farm, "/opportunities": intel, "/simulator": crops, "/capacity": treatments, "/risks": fields,
  "/collective": team, "/outcomes": harvest, "/traceability": stock, "/funding": finance, "/vet-check": health, "/copilot": intel,
};
