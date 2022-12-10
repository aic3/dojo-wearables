using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using System.Xml.Linq;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Attributes;
using Microsoft.Azure.WebJobs.Extensions.OpenApi.Core.Enums;
using Microsoft.CognitiveServices.Speech;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.OpenApi.Models;
using Newtonsoft.Json;

namespace dojo_speech_svc
{
    public class TextToSpeech
    {
        private static string SPEECH_SERVICES_KEY = "SPEECH_SERVICES_KEY";
        private static string SPEECH_SERVICES_REGION = "SPEECH_SERVICES_REGION";
        private readonly ILogger<TextToSpeech> _logger;
        private IConfigurationRoot _config;

        public TextToSpeech(ILogger<TextToSpeech> log)
        {
            _logger = log;

            // load the app settings
            this._config = new ConfigurationBuilder()
                .AddJsonFile("local.settings.json", optional: true, reloadOnChange: true)
                .AddEnvironmentVariables()
                .Build();

            this._logger.LogDebug("app settings loaded");
        }

        /// <summary>
        /// ref: https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/how-to-speech-synthesis?tabs=browserjs%2Cterminal&pivots=programming-language-csharp
        /// ref: https://arminreiter.com/2017/02/return-html-file-content-c-azure-function/
        /// </summary>
        /// <param name="req"></param>
        /// <returns></returns>
        [FunctionName("ConvertTextToSpeech")]
        public async Task<HttpResponseMessage> ConvertTextToSpeech([HttpTrigger(AuthorizationLevel.Function, "get","post", Route = null)] HttpRequest req)
        {
            SpeechSynthesizer synth = this.GetSpeechSynthesizer();
            string body = await new StreamReader(req.Body).ReadToEndAsync();
            dynamic data = JsonConvert.DeserializeObject(body);
            string text = req.Query["text"];
            SpeechSynthesisResult result;
            HttpResponseMessage rspMsg = null;

            // pull the text from the content body if it exists
            text = text ?? data?.text;
            this._logger.LogDebug($"callng synth.SpeakTextAsync with {text}");
            result = await synth.SpeakTextAsync(text);
            this._logger.LogDebug($"Synth result: {result.Reason} - {text}");

            // save the output to a stream
            using (AudioDataStream stream = AudioDataStream.FromResult(result))
            {
                this._logger.LogDebug($"converting audio stream");
                MemoryStream mStream = new MemoryStream();
                Guid reqId = Guid.NewGuid();
                int bufferSize = 4096000;
                byte[] buffer = new byte[bufferSize];
                int read = 0;
                do
                {
                    read = (int)stream.ReadData(buffer);
                    mStream.Write(buffer, 0, read);
                } while (read > 0);

                // create the file stream
                this._logger.LogDebug("Creating HttpResponseMessage");
                mStream.Position = 0;
                // streamResult = new FileStreamResult(mStream, "audio/mpeg3");

                rspMsg = new HttpResponseMessage(HttpStatusCode.OK);
                rspMsg.Content = new StreamContent(mStream);
                rspMsg.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
                {
                    FileName = $"{reqId.ToString()}.wav" 
                };
                // rspMsg.Content.Headers.ContentType = new MediaTypeHeaderValue("audio/mpeg3");                
            }

            this._logger.LogDebug("returning audio attachment");
            return rspMsg;
        }

        /// <summary>
        /// Create the target speech synthensizer
        /// </summary>
        /// <returns></returns>
        private SpeechSynthesizer GetSpeechSynthesizer()
        {
            string key = this._config[TextToSpeech.SPEECH_SERVICES_KEY];
            string region = this._config[TextToSpeech.SPEECH_SERVICES_REGION];
            SpeechConfig config;
            SpeechSynthesizer speechSynthesizer;
            
            config = SpeechConfig.FromSubscription(key, region);
            config.SetSpeechSynthesisOutputFormat(SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3);
            speechSynthesizer = new SpeechSynthesizer(config);

            this._logger.LogDebug("Speech synthensizer created");
            return speechSynthesizer;
        }

        /*
        [FunctionName("Function1")]
        [OpenApiOperation(operationId: "Run", tags: new[] { "name" })]
        [OpenApiSecurity("function_key", SecuritySchemeType.ApiKey, Name = "code", In = OpenApiSecurityLocationType.Query)]
        [OpenApiParameter(name: "name", In = ParameterLocation.Query, Required = true, Type = typeof(string), Description = "The **Name** parameter")]
        [OpenApiResponseWithBody(statusCode: HttpStatusCode.OK, contentType: "text/plain", bodyType: typeof(string), Description = "The OK response")]
        public async Task<IActionResult> Run(
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
        */
    }
}

