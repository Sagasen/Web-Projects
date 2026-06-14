function sendWhatsApp(
number,
message
){

 const token =
 getFonnteToken();

 const options = {

   method:"post",

   headers:{

      Authorization:
      token

   },

   payload:{

      target:number,

      message:message

   }

 };

 UrlFetchApp.fetch(

   "https://api.fonnte.com/send",

   options

 );

}

//Ambil Token
function getFonnteToken(){

 const data =
 getSheet("SETTINGS")
 .getDataRange()
 .getValues();

 for(let i=1;i<data.length;i++){

   if(
      data[i][0]
      ==
      "FONNTE_TOKEN"
   ){

      return data[i][1];

   }

 }

 return "";

}
