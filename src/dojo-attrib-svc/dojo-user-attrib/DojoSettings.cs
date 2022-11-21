using System.IO;
using System.Net;
using System.Threading.Tasks;
using DevOpsDojo.Users.Functions.Settings;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace DevOpsDojo.Users.Functions
{
    public class DojoSettings
    {
        private readonly ILogger<DojoSettings> _logger;

        public DojoSettings(ILogger<DojoSettings> log)
        {
            _logger = log;
        }

        [FunctionName("GetDojoUserSettings")]
        public async Task<IActionResult> GetDojoUserSettingsFuncDev(
            [HttpTrigger(AuthorizationLevel.Function, "get", "post", Route = null)] HttpRequest req)
        {
            _logger.LogInformation("C# HTTP trigger function processed a request.");

            string name = req.Query["name"];

            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            dynamic data = JsonConvert.DeserializeObject(requestBody);
            name = name ?? data?.name;

            string responseMessage = string.IsNullOrEmpty(name)
                ? "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response."
                : $"Hello, {name}. This HTTP triggered function executed successfully.";

            return new OkObjectResult(responseMessage);
        }

        [FunctionName("Echo")]
        public async Task<IActionResult> EchoFunc(
            [HttpTrigger(AuthorizationLevel.Function, "get", "post", Route = null)] HttpRequest req)
        {

            UserSettings settings = new UserSettings()
            {
                Id = "000-000-000",
                Name = "Sample user",
                Shirt = "red",
                Belt = "dojo-gi"
            };
            // string 
            return null;
        }

        [FunctionName("UserSettings")]
        public async Task<IActionResult> GetUserSettings(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = null)] HttpRequest req){
            string body = await new StreamReader(req.Body).ReadToEndAsync();
            
            // get the settings request
            UserSettings settingsInput = JsonConvert.DeserializeObject<UserSettings>(body);

            // get the id
            string id = settingsInput.Id;


            UserSettings settings = new UserSettings()
            {
                Id = settingsInput.Id + " output",
                Name = "Sample user",
                Shirt = "red",
                Belt = "dojo-gi"
            };
            // string 
            return new OkObjectResult(settings);
        }
    }
}

