using System.IO;
using System.Net;
using System.Threading.Tasks;
using System.Xml.Linq;
using DevOpsDojo.Users.Functions.Settings;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Azure.Data.Tables;
using Azure.Data.Tables.Models;
using Azure;
using System.Linq;
using System;

namespace DevOpsDojo.Users.Functions
{
    public class DojoSettings
    {
        private readonly ILogger<DojoSettings> _logger;
        private IConfigurationRoot _config;
        private static string SETTINGS_CONNECTION_STRING = "SETTINGS_CONNECTION_STRING";
        private static string SETTINGS_USER_SETTINGS_TABLE = "usersettings";

        public DojoSettings(ILogger<DojoSettings> log)
        {
            _logger = log;

            // load the local app settings
            this.LoadAppSettings();
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
        [FunctionName("GetUserSettings")]
        public async Task<IActionResult> GetUserSettingsFunc(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = null)] HttpRequest req){
            string body = await new StreamReader(req.Body).ReadToEndAsync();

            // get the settings request
            UserSettings settingsInput = JsonConvert.DeserializeObject<UserSettings>(body);

            // get the id
            Guid id = settingsInput.Id;
            UserSettings settings = new UserSettings() { 
                Id = id
            };
            TableClient tableClient = this.GetTableServiceClient();
            Pageable<UserSettings> qryResults = tableClient.Query<UserSettings>(s => s.Id == id);

            if (qryResults.Count() == 1) {
                settings = qryResults.FirstOrDefault();
            }
            return new OkObjectResult(settings);
        }

        [FunctionName("SetUserSettings")]
        public async Task<IActionResult> SetUserSettingsFunc(
           [HttpTrigger(AuthorizationLevel.Function, "post", Route = null)] HttpRequest req)
        {
            string body = await new StreamReader(req.Body).ReadToEndAsync();

            // get the settings request
            UserSettings settings = JsonConvert.DeserializeObject<UserSettings>(body);

            TableClient tableClient = this.GetTableServiceClient();
            Pageable<UserSettings> qryResults = tableClient.Query<UserSettings>(s => s.Id == settings.Id);

            if (qryResults.Count() == 1)
            {
                UserSettings userSettings = qryResults.FirstOrDefault();
                settings.ETag = userSettings.ETag;
                settings.PartitionKey = userSettings.PartitionKey;
                settings.RowKey = userSettings.RowKey;
            }
            else
            {
                settings.RowKey = settings.Id.ToString();
                settings.PartitionKey = settings.Name.ToLower().Substring(0,1);                
            }

            settings.Timestamp = DateTime.UtcNow;

            // retrieve the new updated
            tableClient.UpsertEntity<UserSettings>(settings);

            return new OkObjectResult(settings);
        }

        private TableClient GetTableServiceClient()
        {
            string connectionString = this._config[DojoSettings.SETTINGS_CONNECTION_STRING];

            // ref: https://github.com/Azure/azure-sdk-for-net/tree/main/sdk/tables/Azure.Data.Tables/samples
            // get the current users settings
            return new TableClient(connectionString, DojoSettings.SETTINGS_USER_SETTINGS_TABLE);
        }

        private void LoadAppSettings()
        {
            this._config = new ConfigurationBuilder()
                .AddJsonFile("local.settings.json", optional: true, reloadOnChange: true)
                .AddEnvironmentVariables()
                .Build();
        }
    }
}

