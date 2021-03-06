
    /**
     * The ObjectAssert object provides functions to test JavaScript objects
     * for a variety of cases.
     *
     * @class ObjectAssert
     * @static
     */
    Y.ObjectAssert = {
    
        areEqual: function(expected /*:Object*/, actual /*:Object*/, message /*:String*/) /*:Void*/ {
            Y.Assert._increment();               
            Y.Object.each(expected, function(value, name){
                if (expected[name] != actual[name]){
                    throw new Y.Assert.ComparisonFailure(Y.Assert._formatMessage(message, "Values should be equal for property " + name), expected[name], actual[name]);
                }
            });            
        },
        
        /**
         * Asserts that an object has a property with the given name.
         * @param {String} propertyName The name of the property to test.
         * @param {Object} object The object to search.
         * @param {String} message (Optional) The message to display if the assertion fails.
         * @method has
         * @static
         */    
        has : function (propertyName /*:String*/, object /*:Object*/, message /*:String*/) /*:Void*/ {
            Y.Assert._increment();               
            if (!(propertyName in object)){
                Y.Assert.fail(Y.Assert._formatMessage(message, "Property '" + propertyName + "' not found on object."));
            }    
        },
        
        /**
         * Asserts that an object has all properties of a reference object.
         * @param {Object} refObject The object whose properties should be on the object to test.
         * @param {Object} object The object to search.
         * @param {String} message (Optional) The message to display if the assertion fails.
         * @method hasAll
         * @static
         */    
        hasAll : function (refObject /*:Object*/, object /*:Object*/, message /*:String*/) /*:Void*/ {
            Y.Assert._increment();               
            Y.Object.each(refObject, function(value, name){
                if (!(name in object)){
                    Y.Assert.fail(Y.Assert._formatMessage(message, "Property '" + name + "' not found on object."));
                }    
            });
        },
        
        /**
         * Asserts that a property with the given name exists on an object instance (not on its prototype).
         * @param {String} propertyName The name of the property to test.
         * @param {Object} object The object to search.
         * @param {String} message (Optional) The message to display if the assertion fails.
         * @method owns
         * @static
         */    
        owns : function (propertyName /*:String*/, object /*:Object*/, message /*:String*/) /*:Void*/ {
            Y.Assert._increment();               
            if (!object.hasOwnProperty(propertyName)){
                Y.Assert.fail(Y.Assert._formatMessage(message, "Property '" + propertyName + "' not found on object instance."));
            }     
        },
        
        /**
         * Asserts that all properties on a given object also exist on an object instance (not on its prototype).
         * @param {Object} refObject The object whose properties should be owned by the object to test.
         * @param {Object} object The object to search.
         * @param {String} message (Optional) The message to display if the assertion fails.
         * @method ownsAll
         * @static
         */    
        ownsAll : function (refObject /*:Object*/, object /*:Object*/, message /*:String*/) /*:Void*/ {
            Y.Assert._increment();               
            Y.Object.each(refObject, function(value, name){
                if (!object.hasOwnProperty(name)){
                    Y.Assert.fail(Y.Assert._formatMessage(message, "Property '" + name + "' not found on object instance."));
                }     
            });
        }
    };
