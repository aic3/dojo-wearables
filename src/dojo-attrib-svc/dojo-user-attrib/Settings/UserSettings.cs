using Newtonsoft.Json;
using System;

namespace DevOpsDojo.Users.Functions.Settings
{
    /// <summary>
    /// Dojo user settings class
    /// </summary>
    [Serializable]
    public class UserSettings
    {
        [JsonProperty("id")]
        public string? Id { get; set; }
        [JsonProperty("name")]
        public string? Name { get; set; }
        [JsonProperty("shirt")]
        public string? Shirt { get; set; }
        [JsonProperty("belt")]
        public string Belt { get; set; }
    }
}
