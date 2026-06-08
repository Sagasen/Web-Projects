// Simpan Servis
function saveService(data) {
  const serviceSheet = getSheet("SERVICES");

  const serviceId = "SRV" + new Date().getTime();

  let totalSparepart = 0;

  data.items.forEach(item => {
    totalSparepart += Number(item.subtotal || 0);
  });

  const jasa = Number(data.jasa || 0);
  const grandTotal = totalSparepart + jasa;

  serviceSheet.appendRow([
    serviceId,
    data.customerId,
    data.vehicleId,
    new Date(),
    data.km,
    data.keluhan,
    data.diagnosa,
    data.mekanik,
    jasa,
    totalSparepart,
    grandTotal
  ]);

  saveServiceItems(serviceId, data.items);

  try {
    createReminder(data.customerId, data.vehicleId);
  } catch (err) {
    Logger.log("Reminder gagal dibuat: " + err.message);
  }

  let waUrl = "";

  try {
    waUrl = createWhatsAppWebReportUrl(serviceId);
  } catch (err) {
    Logger.log("Link WhatsApp gagal dibuat: " + err.message);
  }

  return {
    success: true,
    serviceId: serviceId,
    waUrl: waUrl
  };
}


// Simpan Sparepart
function saveServiceItems(serviceId, items) {
  const sheet = getSheet("SERVICE_ITEMS");

  items.forEach((item, index) => {
    sheet.appendRow([
      "ITM" + new Date().getTime() + index,
      serviceId,
      item.nama,
      Number(item.qty || 0),
      Number(item.harga || 0),
      Number(item.subtotal || 0)
    ]);
  });
}


// Riwayat Servis Customer Lama
function getMyServices() {
  const customerId = PropertiesService
    .getUserProperties()
    .getProperty("CUSTOMER_ID");

  const services = getSheet("SERVICES").getDataRange().getValues();

  let result = [];

  for (let i = 1; i < services.length; i++) {
    if (services[i][1] == customerId) {
      result.push({
        serviceId: services[i][0],
        tanggal: services[i][3],
        tanggalFormat: formatDateServer(services[i][3]),
        km: services[i][4],
        total: services[i][10]
      });
    }
  }

  result.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));

  return result;
}


// Detail Servis Lama
function getServiceDetail(serviceId) {
const data = getInvoiceDetailForCustomer(serviceId);

  return {
    serviceId: data.serviceId,
    tanggal: data.tanggal,
    tanggalFormat: data.tanggalFormat,
    km: data.km,
    keluhan: data.keluhan,
    diagnosa: data.diagnosa,
    jasa: data.jasa,
    total: data.totalBiaya,
    spareparts: data.items
  };
}


// Invoice Sederhana untuk WhatsApp
function generateInvoiceText(serviceId) {
  const data = getInvoiceDetailForCustomer(serviceId);

  let text =
`🔧 INVOICE SERVIS

Nama Bengkel:
${data.namaBengkel}

Tanggal:
${data.tanggalFormat}

Pelanggan:
${data.namaPelanggan}

Motor:
${data.merk} ${data.tipe}
Plat: ${data.plat}

KM:
${data.km}

Keluhan:
${data.keluhan}

Diagnosa:
${data.diagnosa}

Mekanik:
${data.mekanik}

RINCIAN SPAREPART:
`;

  if (!data.items || data.items.length === 0) {
    text += `
Tidak ada sparepart.
`;
  } else {
    data.items.forEach(item => {
      text +=
`
- ${item.nama}
  Qty: ${item.qty}
  Harga: Rp${Number(item.harga).toLocaleString("id-ID")}
  Subtotal: Rp${Number(item.subtotal).toLocaleString("id-ID")}
`;
    });
  }

  text +=
`
Jasa Servis:
Rp${Number(data.jasa).toLocaleString("id-ID")}

Total Sparepart:
Rp${Number(data.totalSparepart).toLocaleString("id-ID")}

TOTAL BIAYA:
Rp${Number(data.totalBiaya).toLocaleString("id-ID")}

Terima kasih sudah melakukan servis di ${data.namaBengkel}.
`;

  return text;
}


function sendServiceReport(serviceId) {
  return {
    success: true,
    url: createWhatsAppWebReportUrl(serviceId)
  };
}


// Ambil Daftar Invoice Customer
function getCustomerInvoices() {
  const props = PropertiesService.getUserProperties().getProperties();

  const customerId = String(props.CUSTOMER_ID || "").trim();
  const vehicleId = String(props.VEHICLE_ID || "").trim();

  if (!customerId) {
    throw new Error("CUSTOMER_ID tidak ditemukan. Silakan login ulang.");
  }

  const services = getSheet("SERVICES").getDataRange().getValues();

  const result = [];

  for (let i = 1; i < services.length; i++) {
    const serviceCustomerId = String(services[i][1] || "").trim();
    const serviceVehicleId = String(services[i][2] || "").trim();

    if (
      serviceCustomerId === customerId ||
      serviceVehicleId === vehicleId
    ) {
      result.push({
        serviceId: services[i][0],
        tanggal: services[i][3],
        tanggalFormat: formatDateServer(services[i][3]),
        km: services[i][4],
        totalBiaya: Number(services[i][10] || 0)
      });
    }
  }

  result.sort(function(a, b) {
    return new Date(b.tanggal) - new Date(a.tanggal);
  });

  return result;
}

function getInvoiceDetail(serviceId) {
  serviceId = String(serviceId || "").trim();

  if (!serviceId) {
    throw new Error("SERVICE_ID kosong.");
  }

  const services = getSheet("SERVICES").getDataRange().getValues();
  const customers = getSheet("CUSTOMERS").getDataRange().getValues();
  const vehicles = getSheet("VEHICLES").getDataRange().getValues();
  const itemsData = getSheet("SERVICE_ITEMS").getDataRange().getValues();

  let service = null;

  for (let i = 1; i < services.length; i++) {
    const currentServiceId = String(services[i][0] || "").trim();

    if (currentServiceId === serviceId) {
      service = services[i];
      break;
    }
  }

  if (!service) {
    throw new Error(
      "Data servis tidak ditemukan. SERVICE_ID yang dikirim: " + serviceId
    );
  }

  const customerId = String(service[1] || "").trim();
  const vehicleId = String(service[2] || "").trim();

  let customer = null;

  for (let i = 1; i < customers.length; i++) {
    if (String(customers[i][0] || "").trim() === customerId) {
      customer = customers[i];
      break;
    }
  }

  let vehicle = null;

  for (let i = 1; i < vehicles.length; i++) {
    if (String(vehicles[i][0] || "").trim() === vehicleId) {
      vehicle = vehicles[i];
      break;
    }
  }

  const items = [];
  let totalSparepart = 0;

  for (let i = 1; i < itemsData.length; i++) {
    const itemServiceId = String(itemsData[i][1] || "").trim();

    if (itemServiceId === serviceId) {
      const subtotal = Number(itemsData[i][5] || 0);

      items.push({
        nama: itemsData[i][2] || "-",
        qty: Number(itemsData[i][3] || 0),
        harga: Number(itemsData[i][4] || 0),
        subtotal: subtotal
      });

      totalSparepart += subtotal;
    }
  }

  const jasa = Number(service[8] || 0);
  const totalBiaya = Number(service[10] || jasa + totalSparepart);

  return {
    serviceId: service[0],
    namaBengkel: "Workshop Service",
    tanggal: service[3],
    tanggalFormat: formatDateServer(service[3]),

    namaPelanggan: customer ? customer[1] : "-",
    hp: customer ? customer[2] : "-",

    plat: vehicle ? vehicle[2] : "-",
    merk: vehicle ? vehicle[3] : "-",
    tipe: vehicle ? vehicle[4] : "-",

    km: service[4] || "-",
    keluhan: service[5] || "-",
    diagnosa: service[6] || "-",
    mekanik: service[7] || "-",

    jasa: jasa,
    totalSparepart: totalSparepart,
    totalBiaya: totalBiaya,
    items: items
  };
}


function formatDateServer(dateValue) {
  if (!dateValue) return "-";

  const d = new Date(dateValue);

  return Utilities.formatDate(
    d,
    Session.getScriptTimeZone(),
    "dd/MM/yy"
  );
}


// Export PDF
function createInvoicePdf(serviceId) {
  const data = getInvoiceDetailForCustomer(serviceId);

  const template = HtmlService.createTemplateFromFile("InvoicePdf");
  template.data = data;

  const html = template.evaluate().getContent();

  const blob = Utilities
    .newBlob(html, "text/html", "invoice.html")
    .getAs("application/pdf")
    .setName("Invoice-Servis-" + serviceId + ".pdf");

  const file = DriveApp.createFile(blob);

  file.setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  );

  return {
    success: true,
    url: file.getUrl()
  };
}

//SendWhatsApp



function formatPhoneForWa(hp) {
  hp = String(hp || "").replace(/\D/g, "");

  if (hp.startsWith("0")) {
    hp = "62" + hp.substring(1);
  }

  return hp;
}




function debugCustomerInvoices() {
  const props = PropertiesService.getUserProperties().getProperties();

  const customerId = props.CUSTOMER_ID;
  const vehicleId = props.VEHICLE_ID;

  const services = getSheet("SERVICES").getDataRange().getValues();
  const vehicles = getSheet("VEHICLES").getDataRange().getValues();

  let currentVehicle = null;

  for (let i = 1; i < vehicles.length; i++) {
    if (vehicles[i][0] == vehicleId) {
      currentVehicle = vehicles[i];
      break;
    }
  }

  let matchCustomer = 0;
  let matchVehicle = 0;
  let matchBoth = 0;

  for (let i = 1; i < services.length; i++) {
    if (services[i][1] == customerId) {
      matchCustomer++;
    }

    if (services[i][2] == vehicleId) {
      matchVehicle++;
    }

    if (
      services[i][1] == customerId &&
      services[i][2] == vehicleId
    ) {
      matchBoth++;
    }
  }

  return {
    sessionCustomerId: customerId,
    sessionVehicleId: vehicleId,
    sessionPlat: currentVehicle ? currentVehicle[2] : "-",
    totalServices: Math.max(services.length - 1, 0),
    matchCustomer: matchCustomer,
    matchVehicle: matchVehicle,
    matchBoth: matchBoth
  };
}

function getCustomerPageData() {
  const props = PropertiesService.getUserProperties().getProperties();

  const customerId = String(props.CUSTOMER_ID || "").trim();
  const vehicleId = String(props.VEHICLE_ID || "").trim();

  if (!customerId || !vehicleId) {
    throw new Error("Session customer tidak ditemukan. Silakan login ulang.");
  }

  const customers = getSheet("CUSTOMERS").getDataRange().getValues();
  const vehicles = getSheet("VEHICLES").getDataRange().getValues();
  const services = getSheet("SERVICES").getDataRange().getValues();
  const itemsData = getSheet("SERVICE_ITEMS").getDataRange().getValues();

  let customer = null;
  let vehicle = null;

  for (let i = 1; i < customers.length; i++) {
    if (String(customers[i][0] || "").trim() === customerId) {
      customer = customers[i];
      break;
    }
  }

  for (let i = 1; i < vehicles.length; i++) {
    if (String(vehicles[i][0] || "").trim() === vehicleId) {
      vehicle = vehicles[i];
      break;
    }
  }

  if (!customer) {
    throw new Error("Data customer tidak ditemukan di sheet CUSTOMERS.");
  }

  if (!vehicle) {
    throw new Error("Data kendaraan tidak ditemukan di sheet VEHICLES.");
  }

  const profile = {
    customerId: customer[0],
    nama: customer[1],
    hp: customer[2],
    alamat: customer[3] || "",
    vehicleId: vehicle[0],
    plat: vehicle[2],
    kendaraan: vehicle[3],
    tipe: vehicle[4]
  };

  const invoices = [];

  for (let i = 1; i < services.length; i++) {
    const row = services[i];

    const serviceId = String(row[0] || "").trim();
    const serviceCustomerId = String(row[1] || "").trim();
    const serviceVehicleId = String(row[2] || "").trim();

    if (
      serviceCustomerId === customerId ||
      serviceVehicleId === vehicleId
    ) {
      const items = [];
      let totalSparepart = 0;

      for (let j = 1; j < itemsData.length; j++) {
        const itemServiceId = String(itemsData[j][1] || "").trim();

        if (itemServiceId === serviceId) {
          const subtotal = Number(itemsData[j][5] || 0);

          items.push({
            nama: itemsData[j][2] || "-",
            qty: Number(itemsData[j][3] || 0),
            harga: Number(itemsData[j][4] || 0),
            subtotal: subtotal
          });

          totalSparepart += subtotal;
        }
      }

      const jasa = Number(row[8] || 0);
      const totalBiaya = Number(row[10] || jasa + totalSparepart);

      invoices.push({
        serviceId: serviceId,
        namaBengkel: "Workshop Service",
        tanggal: row[3],
        tanggalFormat: formatDateServer(row[3]),

        namaPelanggan: customer[1],
        hp: customer[2],

        plat: vehicle[2],
        merk: vehicle[3],
        tipe: vehicle[4],

        km: row[4] || "-",
        keluhan: row[5] || "-",
        diagnosa: row[6] || "-",
        mekanik: row[7] || "-",

        jasa: jasa,
        totalSparepart: totalSparepart,
        totalBiaya: totalBiaya,
        items: items
      });
    }
  }

  invoices.sort(function(a, b) {
    return new Date(b.tanggal) - new Date(a.tanggal);
  });

  return {
    profile: profile,
    invoices: invoices
  };
}


function getInvoiceDetailForCustomer(serviceId) {
  serviceId = String(serviceId || "").replace(/"/g, "").trim();

  if (!serviceId) {
    throw new Error("SERVICE_ID kosong.");
  }

  const services = getSheet("SERVICES").getDataRange().getValues();
  const customers = getSheet("CUSTOMERS").getDataRange().getValues();
  const vehicles = getSheet("VEHICLES").getDataRange().getValues();
  const itemsData = getSheet("SERVICE_ITEMS").getDataRange().getValues();

  let service = null;

  for (let i = 1; i < services.length; i++) {
    const currentId = String(services[i][0] || "").replace(/"/g, "").trim();

    if (currentId === serviceId) {
      service = services[i];
      break;
    }
  }

  if (!service) {
    const availableIds = [];

    for (let i = 1; i < services.length; i++) {
      availableIds.push(String(services[i][0] || "").trim());
    }

    throw new Error(
      "Data servis tidak ditemukan. ID dikirim: " +
      serviceId +
      ". ID tersedia: " +
      availableIds.join(", ")
    );
  }

  const customerId = String(service[1] || "").trim();
  const vehicleId = String(service[2] || "").trim();

  let customer = null;
  for (let i = 1; i < customers.length; i++) {
    if (String(customers[i][0] || "").trim() === customerId) {
      customer = customers[i];
      break;
    }
  }

  let vehicle = null;
  for (let i = 1; i < vehicles.length; i++) {
    if (String(vehicles[i][0] || "").trim() === vehicleId) {
      vehicle = vehicles[i];
      break;
    }
  }

  const items = [];
  let totalSparepart = 0;

  for (let i = 1; i < itemsData.length; i++) {
    const itemServiceId = String(itemsData[i][1] || "").replace(/"/g, "").trim();

    if (itemServiceId === serviceId) {
      const subtotal = Number(itemsData[i][5] || 0);

      items.push({
        nama: itemsData[i][2] || "-",
        qty: Number(itemsData[i][3] || 0),
        harga: Number(itemsData[i][4] || 0),
        subtotal: subtotal
      });

      totalSparepart += subtotal;
    }
  }

  const jasa = Number(service[8] || 0);
  const totalBiaya = Number(service[10] || jasa + totalSparepart);

  return {
    serviceId: service[0],
    namaBengkel: "Workshop Service",
    tanggal: service[3],
    tanggalFormat: formatDateServer(service[3]),

    namaPelanggan: customer ? customer[1] : "-",
    hp: customer ? customer[2] : "-",

    plat: vehicle ? vehicle[2] : "-",
    merk: vehicle ? vehicle[3] : "-",
    tipe: vehicle ? vehicle[4] : "-",

    km: service[4] || "-",
    keluhan: service[5] || "-",
    diagnosa: service[6] || "-",
    mekanik: service[7] || "-",

    jasa: jasa,
    totalSparepart: totalSparepart,
    totalBiaya: totalBiaya,
    items: items
  };
}

//Pembuat Laporan WhatsApp Web
function createWhatsAppWebReportUrl(serviceId) {
  const data = getInvoiceDetailForCustomer(serviceId);

  const hp = formatPhoneForWa(data.hp);
  const message = generateWhatsAppReportText(serviceId);

  return "https://wa.me/" + hp + "?text=" + encodeURIComponent(message);
}

//Template Laporan WhatsApp Web
function generateWhatsAppReportText(serviceId) {
  const data = getInvoiceDetailForCustomer(serviceId);

  let text =
`Halo Kak ${data.namaPelanggan},

Terima kasih sudah melakukan servis di ${data.namaBengkel}.

Berikut laporan servis kendaraan Kakak:

Tanggal Servis: ${data.tanggalFormat}
ID Servis: ${data.serviceId}

DATA KENDARAAN
Plat: ${data.plat}
Motor: ${data.merk} ${data.tipe}
KM: ${data.km}

DETAIL SERVIS
Keluhan:
${data.keluhan}

Diagnosa:
${data.diagnosa}

Mekanik:
${data.mekanik}

RINCIAN BIAYA
Jasa Servis: Rp ${Number(data.jasa).toLocaleString("id-ID")}
`;

  if (!data.items || data.items.length === 0) {
    text += `
Sparepart: Tidak ada
`;
  } else {
    text += `
Sparepart:
`;

    data.items.forEach(function(item, index) {
      text += `
${index + 1}. ${item.nama}
   Qty: ${item.qty}
   Harga: Rp ${Number(item.harga).toLocaleString("id-ID")}
   Subtotal: Rp ${Number(item.subtotal).toLocaleString("id-ID")}
`;
    });
  }

  text += `
Total Sparepart: Rp ${Number(data.totalSparepart).toLocaleString("id-ID")}
TOTAL BIAYA: Rp ${Number(data.totalBiaya).toLocaleString("id-ID")}

Silakan hubungi kami jika ada pertanyaan.
Terima kasih 🙏`;

  return text;
}