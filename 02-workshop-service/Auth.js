function loginAdmin(username,password){

 const sheet = getSheet("ADMINS");
 const data = sheet.getDataRange().getValues();

 for(let i=1;i<data.length;i++){

   if(
      data[i][1] == username &&
      data[i][2] == password
   ){

      PropertiesService
      .getUserProperties()
      .setProperty(
         "ROLE",
         "ADMIN"
      );

      return {
         success:true
      };
   }
 }

 return {
   success:false
 };
}

//Login Customer
function loginCustomer(hp,plat){

 const customers =
 getSheet("CUSTOMERS")
 .getDataRange()
 .getValues();

 const vehicles =
 getSheet("VEHICLES")
 .getDataRange()
 .getValues();

 let customer = null;

 for(let i=1;i<customers.length;i++){

   if(customers[i][2] == hp){

      customer = customers[i];
      break;

   }
 }

 if(!customer){

   return {
      success:false
   };
 }

 for(let j=1;j<vehicles.length;j++){

   if(
      vehicles[j][1] == customer[0]
      &&
      vehicles[j][2].toUpperCase()
      ==
      plat.toUpperCase()
   ){

      PropertiesService
      .getUserProperties()
      .setProperties({

         ROLE:"CUSTOMER",

         CUSTOMER_ID:customer[0],

         VEHICLE_ID:vehicles[j][0]

      });

      return {
         success:true
      };
   }
 }

 return {
   success:false
 };
}

//Logout
function logout(){

 PropertiesService
 .getUserProperties()
 .deleteAllProperties();

 return true;
}

//Session Checker
function getCurrentUser(){

 return PropertiesService
 .getUserProperties()
 .getProperties();

}
