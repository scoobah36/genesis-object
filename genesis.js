import _ from 'lodash'

//allows objects to define genesis arrays that can be pushed
Array.prototype.__genesis__;
Array.prototype.pushCreate = function(newItem){
    if(newItem && this.__genesis__){
        if(newItem._isGenesis){
            this.push(this.__genesis__.create(newItem.create()))
        }else{
            this.push(this.__genesis__.create(newItem))
        }
    }
}

export default function(objectName, objectDefinition, extensions) {
    
    var genesis = {
        __name__: objectName,
        __def__: objectDefinition,
        _isGenesis: true,

        create: function (data, suppressInit) {

            //recusively itterate object attributes to expand any child genesis objects
            var walk = function(wobj, wdata){
                for (var key in wobj) {
                    var attr = wobj[key];
                    var val = wdata[key];
                    // skip loop if the property is from prototype
                    if (!wobj.hasOwnProperty(key) || _.isFunction(attr)) continue;

                    if(_.isArray(attr) && attr[0] && attr[0]._isGenesis) {
                        //genesis arrays should be defined with one genesis object in them 
                        wobj[key].__genesis__ = attr.shift();
                        if(_.isArray(val)){
                            val.forEach(function(item){
                                wobj[key].pushCreate(item)
                            })
                        }
                    }else if(_.isObject(attr)){
                        //create or recurse to find more genesis objects
                        if(attr._isGenesis){
                            wobj[key] = attr.create(val || {});
                        }else {
                            wobj[key] = walk(attr, val || {});
                        }
                    }else if(val != undefined) {
                        //everything else just grab the value
                        wobj[key] = val;
                    }
                }
                return wobj;
            }

            var data = data || {};

            // create obj
            var obj;
            if (_.isFunction(genesis.__def__)) {
                obj = walk(genesis.__def__(), data);
            } else {
                throw new Error('objectDefinition must be a function');
            }

            if (!obj) {
                throw new Error('could not create property', genesis.__name__, genesis.__def__, data);
            }

            _.extend(obj, {
                __uid__: Math.random(),
                __name__: objectName
            });

            // call obj.init
            if (_.isFunction(obj.init) && !suppressInit) {
                obj.init.apply(obj, arguments);
            }

            return obj;
        },
    };

    var exts = [];
    if(_.isArray(extensions)){
        extensions.forEach(function(ext){
            if(ext._isGenesis && _.isFunction(ext.__def__)){
                exts.push(ext.__def__);
            }
        });
    }
    exts.push(objectDefinition);

    genesis.__def__ = function(){
        return _.extend.apply(this, _.map(exts, function(e){
            return e();
        }));
    }

    return genesis;
}
