function getCustomerDashboard() {
  const props = PropertiesService.getUserProperties().getProperties();

  const customerId = String(props.CUSTOMER_ID || "").trim();
  const vehicleId = String(props.VEHICLE_ID || "").trim();

  if (!customerId || !vehicleId) {
    throw new Error("Session customer tidak ditemukan. Silakan login ulang.");
  }

  const customers = getSheet("CUSTOMERS").getDataRange().getValues();
  const vehicles = getSheet("VEHICLES").getDataRange().getValues();

  let customer = null;
  let vehicle = null;

  for (let i = 1; i < customers.length; i++) {
    if (String(customers[i][0]).trim() === customerId) {
      customer = customers[i];
      break;
    }
  }

  for (let i = 1; i < vehicles.length; i++) {
    if (String(vehicles[i][0]).trim() === vehicleId) {
      vehicle = vehicles[i];
      break;
    }
  }

  if (!customer || !vehicle) {
    throw new Error("Data customer atau kendaraan tidak ditemukan.");
  }

  return {
    customerId: customer[0],
    nama: customer[1],
    hp: customer[2],
    alamat: customer[3] || "",
    vehicleId: vehicle[0],
    plat: vehicle[2],
    kendaraan: vehicle[3],
    tipe: vehicle[4]
  };
}
