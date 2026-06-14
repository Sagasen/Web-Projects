function adminGetStats() {
  const customers = getSheet("CUSTOMERS").getDataRange().getValues();
  const vehicles = getSheet("VEHICLES").getDataRange().getValues();
  const services = getSheet("SERVICES").getDataRange().getValues();

  let revenue = 0;

  for (let i = 1; i < services.length; i++) {
    revenue += Number(services[i][10] || 0);
  }

  return {
    customers: Math.max(customers.length - 1, 0),
    vehicles: Math.max(vehicles.length - 1, 0),
    services: Math.max(services.length - 1, 0),
    revenue: revenue
  };
}


function adminGetCustomers() {
  const customers = getSheet("CUSTOMERS").getDataRange().getValues();
  const result = [];

  for (let i = 1; i < customers.length; i++) {
    result.push({
      customerId: customers[i][0],
      nama: customers[i][1],
      hp: customers[i][2],
      alamat: customers[i][3] || ""
    });
  }

  return result;
}


function adminSearchCustomers(keyword) {
  keyword = String(keyword || "").toLowerCase();

  const customers = getSheet("CUSTOMERS").getDataRange().getValues();
  const result = [];

  for (let i = 1; i < customers.length; i++) {
    const nama = String(customers[i][1] || "").toLowerCase();
    const hp = String(customers[i][2] || "").toLowerCase();

    if (
      keyword === "" ||
      nama.includes(keyword) ||
      hp.includes(keyword)
    ) {
      result.push({
        customerId: customers[i][0],
        nama: customers[i][1],
        hp: customers[i][2],
        alamat: customers[i][3] || ""
      });
    }
  }

  return result;
}


function adminAddCustomerWithVehicle(data) {
  const customerSheet = getSheet("CUSTOMERS");
  const vehicleSheet = getSheet("VEHICLES");

  const timestamp = new Date().getTime();

  const customerId = "CUST" + timestamp;
  const vehicleId = "VEH" + timestamp;

  customerSheet.appendRow([
    customerId,
    data.nama,
    data.hp,
    data.alamat || "",
    new Date()
  ]);

  vehicleSheet.appendRow([
    vehicleId,
    customerId,
    String(data.plat || "").toUpperCase(),
    data.merk || "",
    data.tipe || "",
    new Date()
  ]);

  return {
    success: true,
    customerId: customerId,
    vehicleId: vehicleId
  };
}


function adminGetVehiclesByCustomer(customerId) {
  const vehicles = getSheet("VEHICLES").getDataRange().getValues();
  const result = [];

  for (let i = 1; i < vehicles.length; i++) {
    if (vehicles[i][1] == customerId) {
      result.push({
        vehicleId: vehicles[i][0],
        customerId: vehicles[i][1],
        noPolisi: vehicles[i][2],
        merk: vehicles[i][3],
        tipe: vehicles[i][4]
      });
    }
  }

  return result;
}


function adminAddVehicle(data) {
  const vehicleSheet = getSheet("VEHICLES");

  const vehicleId = "VEH" + new Date().getTime();

  vehicleSheet.appendRow([
    vehicleId,
    data.customerId,
    String(data.plat || "").toUpperCase(),
    data.merk || "",
    data.tipe || "",
    new Date()
  ]);

  return {
    success: true,
    vehicleId: vehicleId
  };
}


function adminGetServiceHistory() {
  const services = getSheet("SERVICES").getDataRange().getValues();
  const customers = getSheet("CUSTOMERS").getDataRange().getValues();
  const vehicles = getSheet("VEHICLES").getDataRange().getValues();

  const result = [];

  for (let i = 1; i < services.length; i++) {
    const service = services[i];

    const customer = customers.find(c => c[0] == service[1]);
    const vehicle = vehicles.find(v => v[0] == service[2]);

    result.push({
      serviceId: service[0],
      tanggal: adminFormatDate(service[3]),
      namaPelanggan: customer ? customer[1] : "-",
      motor: vehicle ? vehicle[3] + " " + vehicle[4] : "-",
      plat: vehicle ? vehicle[2] : "-",
      total: Number(service[10] || 0)
    });
  }

  result.sort((a, b) => String(b.serviceId).localeCompare(String(a.serviceId)));

  return result;
}


function adminGetReminders() {
  const services = getSheet("SERVICES").getDataRange().getValues();
  const customers = getSheet("CUSTOMERS").getDataRange().getValues();
  const vehicles = getSheet("VEHICLES").getDataRange().getValues();

  const latestMap = {};

  for (let i = 1; i < services.length; i++) {
    const row = services[i];
    const vehicleId = row[2];
    const tanggal = new Date(row[3]).getTime();

    if (!latestMap[vehicleId] || tanggal > latestMap[vehicleId].timestamp) {
      latestMap[vehicleId] = {
        service: row,
        timestamp: tanggal
      };
    }
  }

  const result = [];

  Object.keys(latestMap).forEach(vehicleId => {
    const service = latestMap[vehicleId].service;
    const customer = customers.find(c => c[0] == service[1]);
    const vehicle = vehicles.find(v => v[0] == service[2]);

    result.push({
      serviceId: service[0],
      tanggal: adminFormatDate(service[3]),
      namaPelanggan: customer ? customer[1] : "-",
      motor: vehicle ? vehicle[3] + " " + vehicle[4] : "-",
      plat: vehicle ? vehicle[2] : "-"
    });
  });

  return result;
}


function adminFormatDate(dateValue) {
  if (!dateValue) return "-";

  const d = new Date(dateValue);

  return Utilities.formatDate(
    d,
    Session.getScriptTimeZone(),
    "dd/MM/yy"
  );
}

function adminGetServiceHistoryByVehicle(vehicleId) {
  const services = getSheet("SERVICES").getDataRange().getValues();

  const result = [];

  for (let i = 1; i < services.length; i++) {
    if (services[i][2] == vehicleId) {
      result.push({
        serviceId: services[i][0],
        tanggal: adminFormatDate(services[i][3]),
        km: services[i][4] || "-",
        keluhan: services[i][5] || "-",
        diagnosa: services[i][6] || "-",
        mekanik: services[i][7] || "-",
        jasa: Number(services[i][8] || 0),
        totalSparepart: Number(services[i][9] || 0),
        total: Number(services[i][10] || 0)
      });
    }
  }

  result.sort((a, b) => String(b.serviceId).localeCompare(String(a.serviceId)));

  return result;
}
