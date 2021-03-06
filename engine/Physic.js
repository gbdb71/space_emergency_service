/* jshint bitwise: false */

Ses.Physic = {

   bodyDef:          new Box2D.Dynamics.b2BodyDef(),
   fixtureDef:       new Box2D.Dynamics.b2FixtureDef(),
   revoluteJointDef: new Box2D.Dynamics.Joints.b2RevoluteJointDef(),
   weldJointDef:     new Box2D.Dynamics.Joints.b2WeldJointDef(),


   onBeginContactCallbacks: [],
   onEndContactCallbacks: [],
   onPostSolveContacCallbacks: [],

   jointsToCreate: [],
   jointsToRemove: [],

   CATEGORY_JET_PARTICLE :       0x02,
   CATEGORY_WORLD :              0x04,
   CATEGORY_SENSOR:              0x08,
   CATEGORY_SHIP :               0x10,
   CATEGORY_GRASPER:             0x20,
   CATEGORY_BROKEN_SHIP:         0x80,

   SHIP_MASK :         ~0x0002, // Everything that is not jet particle
   JET_PARTICLE_MASK : ~0x0010 & ~0x0002, // Everything that is not ship and not particle
   SENSOR_MASK: 0x0010, // just space ship
   WORLD_MASK: ~0x0008,

   setupFixtureDef: function(fixtureDef, specification)
   {
      specification = specification || {};

      for(var field in specification)
      {
         if(typeof specification[field] === 'object')
         {
            for(var field_2 in specification[field])
               fixtureDef[field][field_2] = specification[field][field_2];
         }
         else
            fixtureDef[field] = specification[field];
      }

      if ( !specification.density )
         fixtureDef.density = 1;
      else if ( !specification.friction )
         fixtureDef.friction = 0.5;
   },

   createBody: function(fixtureDef)
   {
      var body = Ses.Physic.World.CreateBody(this.bodyDef);
      if (fixtureDef)
         body.CreateFixture(fixtureDef);
      return body;
   },

   createStaticBody: function(fixtureDef, position)
   {
      this.bodyDef.type = Box2D.Dynamics.b2Body.b2_staticBody;
      this.bodyDef.position.Set(position.x, position.y);
      return this.createBody(fixtureDef);
   },

   createDynamicBody: function(fixtureDef, position)
   {
      this.bodyDef.type = Box2D.Dynamics.b2Body.b2_dynamicBody;
      this.bodyDef.position.Set(position.x, position.y);
      return this.createBody(fixtureDef);
   },

   createRectangleObject: function(width, height, position, specification)
   {
      var fixtureDef = new Box2D.Dynamics.b2FixtureDef();
      this.setupFixtureDef(fixtureDef, specification);

      fixtureDef.shape = new Box2D.Collision.Shapes.b2PolygonShape();
      fixtureDef.shape.SetAsBox(width, height);
      return this.createDynamicBody(fixtureDef, position);
   },

   createCircleObject: function(radious, position, specification)
   {
      var fixtureDef = new Box2D.Dynamics.b2FixtureDef();
      this.setupFixtureDef(fixtureDef, specification);
      fixtureDef.shape = new Box2D.Collision.Shapes.b2CircleShape(radious);
      return this.createDynamicBody(fixtureDef, position);
   },

   createRevoluteJoint: function(bodyA, bodyB, vecA, vecB)
   {
      this.revoluteJointDef.localAnchorA.Set(vecA.x, vecA.y);
      this.revoluteJointDef.localAnchorB.Set(vecB.x, vecB.y);
      this.revoluteJointDef.bodyA = bodyA;
      this.revoluteJointDef.bodyB = bodyB;
      return Ses.Physic.World.CreateJoint(this.revoluteJointDef);
   },

   createRevoluteJoint2: function(bodyA, bodyB, anchor)
   {
      var joint = new Box2D.Dynamics.Joints.b2RevoluteJointDef();
      joint.Initialize(bodyA, bodyB, anchor);
      return Ses.Physic.World.CreateJoint(joint);
   },

   createWeldJoint: function(bodyA, bodyB, vec)
   {
      var weldJointDef = new Box2D.Dynamics.Joints.b2WeldJointDef();
      weldJointDef.Initialize(bodyA, bodyB, vec);
      return Ses.Physic.World.CreateJoint(weldJointDef);
   },

   createDistanceJoint: function(bodyA, bodyB, vecA, vecB)
   {
      var distanceJointDef = new Box2D.Dynamics.Joints.b2DistanceJointDef();
      distanceJointDef.Initialize(bodyA, bodyB, vecA, vecB);
      return Ses.Physic.World.CreateJoint(distanceJointDef);
   },

   initContactListener: function()
   {
      var contactListener = new Box2D.Dynamics.b2ContactListener();

      contactListener.BeginContact = this.createContactHandler(
            this.onBeginContactCallbacks);
      contactListener.EndContact =   this.createContactHandler(
            this.onEndContactCallbacks);
      contactListener.PostSolve = this.createContactHandler(
            this.onPostSolveContacCallbacks);

      Ses.Physic.World.SetContactListener(contactListener);
      this.contactListener = contactListener;
   },

   createContactHandler: function(callbackArray)
   {
      return function(contact, impulse)
      {
         var bodyA = contact.GetFixtureA().GetBody();
         var bodyB = contact.GetFixtureB().GetBody();

         for(var i = 0; i < callbackArray.length; ++i)
         {
            var body = callbackArray[i].body;
            var callback = callbackArray[i].callback;

            if( bodyA === body)
               callback.call(undefined, bodyB, impulse);
            else if( bodyB === body )
               callback.call(undefined, bodyA, impulse);
         }
      };
   },


   addOnBeginContactListener: function(body, callback)
   {
      if (!this.contactListener)
         this.initContactListener();

      this.onBeginContactCallbacks.push({ body: body, callback: callback });
   },

   addOnEndContactListener: function(body, callback)
   {
      if (!this.contactListener)
         this.initContactListener();

      this.onEndContactCallbacks.push({ body: body, callback: callback });
   },

   addOnPostSolveContactListener: function(body, callback)
   {
      if (!this.contactListener)
         this.initContactListener();

      this.onPostSolveContacCallbacks.push({ body: body, callback: callback });
   },

   /*
    * @body the body that listeners need to be removed
    * @return void
    */
   removeBodyListeners: function(body)
   {
      var i = 0;

      [
         this.onPostSolveContacCallbacks,
         this.onEndContactCallbacks,
         this.onBeginContactCallbacks

      ].forEach(
            function(array) {
               for (var i = 0; i < array.length; ++i)
               {
                  if (array[i].body !== body)
                     continue;

                  array.splice(i, 1);
                  return;
               }
            }
      );
   },

   createRectangleSesnor: function(x, y, width, height, specification)
   {
      var fixtureDef = new Box2D.Dynamics.b2FixtureDef();
      this.setupFixtureDef(fixtureDef, specification);
      fixtureDef.shape = new Box2D.Collision.Shapes.b2PolygonShape();
      fixtureDef.shape.SetAsBox(width, height);
      fixtureDef.isSensor = true;
      return this.createStaticBody(fixtureDef, new Ses.b2Vec2(x, y));
   },

   createCircleSesnor: function(x, y, radious, specification)
   {
      var fixtureDef = new Box2D.Dynamics.b2FixtureDef();
      this.setupFixtureDef(fixtureDef, specification);
      fixtureDef.shape = new Box2D.Collision.Shapes.b2CircleShape(radious);
      fixtureDef.isSensor = true;
      return this.createStaticBody(fixtureDef, new Ses.b2Vec2(x, y));
   },

   destroyWorld: function()
   {
      this.onBeginContactCallbacks = [];
      this.onEndContactCallbacks = [];
      this.onPostSolveContacCallbacks = [];
      this.contactListener = null;

      var joints = Ses.Physic.World.GetJointList(),
          i      = 0;

      if (joints)
         for (i = 0; i < joints.length; ++i)
            Ses.Physic.World.DestroyJoint(joints[i]);

      var bodies = Ses.Physic.World.GetBodyList();
      if (bodies)
      {
         if(bodies.length > 0)
            Ses.err("While destroying world, there are bodies alive !");
         for(i = 0; i < bodies.length; ++i)
            Ses.Physic.World.DestroyBody(bodies[i]);
      }

   },


   //TODO all underneath

   removeJoint: function(joint)
   {
      ///this.jointsToRemove.push(joint);
      Ses.Physic.World.DestroyJoint(joint);
   },
};
