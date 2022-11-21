using Azure;
using Azure.Data.Tables;
using Newtonsoft.Json;
using System;

namespace DevOpsDojo.Users.Functions.Settings
{
    /// <summary>
    /// Dojo user settings class
    /// </summary>
    [Serializable]
    public class UserSettings: ITableEntity
    {
        [JsonProperty("id")]
        public Guid Id { get; set; }
        [JsonProperty("name")]
        public string? Name { get; set; }
        [JsonProperty("shirt")]
        public string? Shirt { get; set; }
        [JsonProperty("belt")]
        public string? Belt { get; set; }
        [JsonIgnore]
        public string PartitionKey { get; set; }
        [JsonIgnore]
        public string RowKey { get; set; }
        [JsonIgnore]
        public DateTimeOffset? Timestamp { get; set; }
        [JsonIgnore]
        public ETag ETag { get; set; }
    }
}
