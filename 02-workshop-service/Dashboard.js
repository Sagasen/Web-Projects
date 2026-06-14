function getDashboardStats(){

 const customers =
 getSheet("CUSTOMERS")
 .getLastRow()-1;

 const vehicles =
 getSheet("VEHICLES")
 .getLastRow()-1;

 const services =
 getSheet("SERVICES")
 .getDataRange()
 .getValues();

 let revenue = 0;

 for(let i=1;i<services.length;i++){

   revenue +=
   Number(
   services[i][10]
   );

 }

 return {

   customers,

   vehicles,

   services:
   services.length-1,

   revenue

 };

}


//JS Dashboard
function loadDashboard(){

 google.script.run
 .withSuccessHandler(
 function(data){

 document
 .getElementById(
 "totalCustomer"
 ).innerText =
 data.customers;

 document
 .getElementById(
 "totalVehicle"
 ).innerText =
 data.vehicles;

 document
 .getElementById(
 "totalService"
 ).innerText =
 data.services;

 document
 .getElementById(
 "totalRevenue"
 ).innerText =

 "Rp " +

 data.revenue
 .toLocaleString();

 })
 .getDashboardStats();

}
