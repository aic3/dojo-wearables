using Azure;
using Azure.Data.Tables;
using Newtonsoft.Json;
using System;
using System.ComponentModel;

namespace DevOpsDojo.Users.Functions.Settings
{
    /// <summary>
    /// Dojo user settings class
    /// </summary>
    [Serializable]
    public class UserSettings: ITableEntity
    {
        private int? _level;

        [JsonProperty("id")]
        public Guid Id { get; set; }
        [JsonProperty("name")]
        public string? Name { get; set; }
        [JsonProperty("shirt")]
        public string? Shirt { get; set; }
        [JsonProperty("level")]
        public int? Level { 
            get {
                return this._level.GetValueOrDefault(-1);
            }
            set
            {
                this._level = value;
            }
        }
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
