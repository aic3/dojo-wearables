using System.IO;
using System.Net;
using System.Threading.Tasks;
using System.Xml.Linq;
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

        /// <summary>
        /// Echo test functin
        /// </summary>
        /// <param name="req"></param>
        /// <returns></returns>
        [FunctionName("Echo")]
        public async Task<IActionResult> EchoFunc(
            [HttpTrigger(AuthorizationLevel.Function, "get", "post", Route = null)] HttpRequest req)
        {
            string echo = req.Query["echo"];
            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            dynamic data = JsonConvert.DeserializeObject(requestBody);
            echo = echo ?? data?.echo;

            // string 
            return new OkObjectResult($"Echo: {echo}"); ;
        }

        /// <summary>
        /// Retreives user settings
        /// </summary>
        /// <param name="req"></param>
        /// <returns></returns>
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

