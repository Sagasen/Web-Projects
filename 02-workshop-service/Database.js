function getSheet(name){
 return SpreadsheetApp
 .getActiveSpreadsheet()
 .getSheetByName(name);
}

//CRUD Customer
function addCustomer(data){

 const sheet =
 getSheet("CUSTOMERS");

 const id =
 "CUS" +
 new Date().getTime();

 sheet.appendRow([

   id,

   data.nama,

   data.hp,

   data.alamat,

   new Date()

 ]);

 return true;

}

//Ambil Semua Customer
function getCustomers(){

 const data =
 getSheet("CUSTOMERS")
 .getDataRange()
 .getValues();

 return data;

}

//CRUD Kendaraan
function addVehicle(data){

 const sheet =
 getSheet("VEHICLES");

 const id =
 "VHC" +
 new Date().getTime();

 sheet.appendRow([

   id,

   data.customerId,

   data.noPolisi,

   data.merk,

   data.tipe,

   data.tahun,

   data.noMesin,

   data.noRangka,

   new Date()

 ]);

 return true;

}

//Ambil Semua Kendaraan
function getVehicles(){

 return getSheet("VEHICLES")
 .getDataRange()
 .getValues();

}

//Cari Customer
function searchCustomers(keyword){

  const sheet = getSheet("CUSTOMERS");

  const data = sheet
    .getDataRange()
    .getValues();

  let result = [];

  for(let i=1;i<data.length;i++){

    const nama = String(data[i][1]).toLowerCase();
    const hp = String(data[i][2]).toLowerCase();

    if(
      nama.includes(keyword.toLowerCase()) ||
      hp.includes(keyword.toLowerCase())
    ){

      result.push({
        customerId:data[i][0],
        nama:data[i][1],
        hp:data[i][2]
      });

    }
  }

  return result;

}

//Ambil Kendaraan Customer
function getVehiclesByCustomer(customerId){

  const sheet =
  getSheet("VEHICLES");

  const data =
  sheet.getDataRange().getValues();

  let result = [];

  for(let i=1;i<data.length;i++){

    if(data[i][1] == customerId){

      result.push({

        vehicleId:data[i][0],

        noPolisi:data[i][2],

        merk:data[i][3],

        tipe:data[i][4],

        tahun:data[i][5]

      });

    }

  }

  return result;

}

//Menyimpan Pelanggan + Kendaraan
function addCustomerWithVehicle(data) {
  const customerSheet = getSheet("CUSTOMERS");
  const vehicleSheet = getSheet("VEHICLES");

  const customerId = "CUST-" + new Date().getTime();
  const vehicleId = "VEH-" + new Date().getTime();

  customerSheet.appendRow([
    customerId,
    data.nama,
    data.hp,
    data.alamat,
    new Date()
  ]);

  vehicleSheet.appendRow([
    vehicleId,
    customerId,
    data.plat,
    data.merk,
    data.tipe,
    new Date()
  ]);

  return {
    success: true,
    customerId: customerId,
    vehicleId: vehicleId
  };
}
