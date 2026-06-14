function getSpareparts(){

 const data =
 getSheet(
 "MASTER_SPAREPART"
 )
 .getDataRange()
 .getValues();

 let result = [];

 for(let i=1;i<data.length;i++){

   result.push({

      kode:data[i][0],

      nama:data[i][1],

      harga:data[i][2]

   });

 }

 return result;

}

function loadSparepartDropdown(){

 google.script.run
 .withSuccessHandler(
 function(data){

 window.sparepartList =
 data;

 })
 .getSpareparts();

}
